#!/usr/bin/env node

/**
 * MCP Server for Autodesk Platform Services Hubs Browser
 * Provides tools and resources for accessing Fusion Hubs, Projects, and Files
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const { getHubs, getProjects, getProjectContents, getItemVersions } = require('./services/aps.js');
// Don't require config.js - it checks for env vars that aren't needed for MCP server
// The MCP server only needs APS_ACCESS_TOKEN or APS_SERVER_URL
const PORT = process.env.PORT || 8080;
const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Token storage with persistence
const TOKEN_STORAGE_FILE = path.join(os.homedir(), '.aps-mcp-token.json');
let accessToken = null;
let tokenExpiresAt = null;
let refreshToken = null;

/**
 * Load tokens from persistent storage
 */
function loadTokens() {
    try {
        if (fs.existsSync(TOKEN_STORAGE_FILE)) {
            const data = JSON.parse(fs.readFileSync(TOKEN_STORAGE_FILE, 'utf8'));
            accessToken = data.accessToken || null;
            tokenExpiresAt = data.tokenExpiresAt || null;
            refreshToken = data.refreshToken || null;
            
            // Validate expiration
            if (tokenExpiresAt && Date.now() >= tokenExpiresAt) {
                // Token expired, clear it but keep refresh token
                accessToken = null;
                tokenExpiresAt = null;
            }
        }
    } catch (error) {
        console.error('Error loading tokens from storage:', error.message);
        // Continue with empty tokens
    }
}

/**
 * Save tokens to persistent storage
 */
function saveTokens() {
    try {
        const data = {
            accessToken,
            tokenExpiresAt,
            refreshToken,
            updatedAt: Date.now()
        };
        fs.writeFileSync(TOKEN_STORAGE_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
    } catch (error) {
        console.error('Error saving tokens to storage:', error.message);
        // Continue without persistence
    }
}

// Load tokens on startup
loadTokens();

/**
 * Get or refresh access token
 * Tries to get token from HTTP endpoint first, then falls back to environment variable
 * Implements token refresh and persistent storage
 */
async function getAccessToken() {
    // Check if we have a valid token (with 5 minute buffer before expiration)
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    if (accessToken && tokenExpiresAt && Date.now() < (tokenExpiresAt - bufferTime)) {
        return accessToken;
    }

    // Try to get token from HTTP endpoint (if Express server is running)
    const serverUrl = process.env.APS_SERVER_URL || `http://localhost:${PORT}`;
    try {
        const url = new URL(`${serverUrl}/api/auth/mcp-token`);
        const client = url.protocol === 'https:' ? https : http;
        
        const data = await new Promise((resolve, reject) => {
            const req = client.get(url, {
                headers: {
                    'Cookie': process.env.APS_SESSION_COOKIE || '', // Pass session cookie if available
                },
            }, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(body));
                        } catch (e) {
                            reject(new Error('Invalid JSON response'));
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                });
            });
            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
        
        accessToken = data.access_token;
        tokenExpiresAt = Date.now() + (data.expires_in * 1000);
        // Store refresh token if provided
        if (data.refresh_token) {
            refreshToken = data.refresh_token;
        }
        
        // Save to persistent storage
        saveTokens();
        
        return accessToken;
    } catch (error) {
        // Fall through to environment variable
        console.error('Could not get token from HTTP endpoint:', error.message);
    }

    // Fall back to environment variable
    const token = process.env.APS_ACCESS_TOKEN;
    if (!token) {
        throw new Error(
            'APS_ACCESS_TOKEN environment variable not set and could not get token from server. ' +
            'Please authenticate via the web app first or set APS_ACCESS_TOKEN.'
        );
    }

    accessToken = token;
    tokenExpiresAt = Date.now() + 3600000; // Assume 1 hour expiry
    
    // Save to persistent storage
    saveTokens();
    
    return accessToken;
}

/**
 * Build tree structure for MCP-UI
 */
function buildTreeNode(id, name, type, children = null, metadata = {}) {
    return {
        id,
        name,
        type,
        children,
        ...metadata
    };
}

/**
 * Parse natural language query to extract search terms and filters
 */
function parseQuery(query) {
    const lowerQuery = query.toLowerCase();
    const result = {
        searchTerm: null,
        type: 'all',
        action: 'list',
    };

    // Check for specific actions
    if (lowerQuery.includes('show me') || lowerQuery.includes('display') || lowerQuery.includes('list')) {
        result.action = 'list';
    }

    // Extract search terms - look for patterns like "named X", "called X", "model X", etc.
    const namePatterns = [
        /(?:named|called|model|file|project|hub)\s+["']?([^"']+)["']?/i,
        /(?:show me|display|find|search for)\s+(?:my|the)?\s*(?:fusion\s+)?(?:model|file|project|hub)?\s*(?:named|called)?\s*["']?([^"']+)["']?/i,
    ];

    for (const pattern of namePatterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
            result.searchTerm = match[1].trim();
            break;
        }
    }

    // If no specific term found, try to extract the last quoted string or significant word
    if (!result.searchTerm) {
        const quotedMatch = query.match(/["']([^"']+)["']/);
        if (quotedMatch) {
            result.searchTerm = quotedMatch[1];
        } else {
            // Try to find significant words after "show me" or similar
            const showMatch = query.match(/(?:show me|display|find)\s+(?:my|the)?\s*(?:fusion\s+)?(?:model|file|project|hub)?\s*(.+)/i);
            if (showMatch && showMatch[1]) {
                const words = showMatch[1].trim().split(/\s+/);
                if (words.length > 0 && words[0].length > 2) {
                    result.searchTerm = words[0];
                }
            }
        }
    }

    // Determine type from query
    if (lowerQuery.includes('hub')) {
        result.type = 'hub';
    } else if (lowerQuery.includes('project')) {
        result.type = 'project';
    } else if (lowerQuery.includes('file') || lowerQuery.includes('model') || lowerQuery.includes('item')) {
        result.type = 'file';
    }

    return result;
}

/**
 * Recursively build tree structure from hubs to files
 * Now includes all nested files with viewer URNs
 */
async function buildTreeStructure(hubId = null, projectId = null, folderId = null, searchTerm = null, maxDepth = 10, currentDepth = 0) {
    const token = await getAccessToken();
    const tree = [];

    try {
        if (!hubId) {
            // Get all hubs
            const hubs = await getHubs(token);
            for (const hub of hubs) {
                const hubName = hub.attributes.name;
                if (searchTerm && !hubName.toLowerCase().includes(searchTerm.toLowerCase())) {
                    continue;
                }
                const hubNode = buildTreeNode(
                    `hub|${hub.id}`,
                    hubName,
                    'hub',
                    true, // has children
                    { hubId: hub.id }
                );
                tree.push(hubNode);
            }
        } else if (!projectId) {
            // Get projects for a hub
            const projects = await getProjects(hubId, token);
            for (const project of projects) {
                const projectName = project.attributes.name;
                if (searchTerm && !projectName.toLowerCase().includes(searchTerm.toLowerCase())) {
                    continue;
                }
                const projectNode = buildTreeNode(
                    `project|${hubId}|${project.id}`,
                    projectName,
                    'project',
                    true,
                    { hubId, projectId: project.id }
                );
                tree.push(projectNode);
            }
        } else {
            // Get contents (top-level or folder contents)
            const contents = await getProjectContents(hubId, projectId, folderId, token);
            
            for (const item of contents) {
                const itemName = item.attributes.displayName;
                if (searchTerm && !itemName.toLowerCase().includes(searchTerm.toLowerCase())) {
                    continue;
                }
                
                const isFolder = item.type === 'folders';
                const metadata = { hubId, projectId, itemId: item.id, isFolder };
                
                // For files, get the viewer URN and version info
                if (!isFolder) {
                    try {
                        const urn = await getItemVersionUrn(hubId, projectId, item.id);
                        if (urn) {
                            metadata.viewerUrn = urn;
                            metadata.viewable = true;
                        }
                        
                        // Get version info
                        try {
                            const versions = await getItemVersions(projectId, item.id, token);
                            if (versions && versions.length > 0) {
                                metadata.versionCount = versions.length;
                                metadata.latestVersion = versions[0].id;
                                metadata.versionName = versions[0].attributes?.displayName || versions[0].attributes?.name || 'Latest';
                            }
                        } catch (err) {
                            // Ignore version errors
                        }
                    } catch (error) {
                        // Ignore errors getting URN
                    }
                }
                
                // Recursively get children for folders (if not at max depth)
                let children = null;
                if (isFolder && currentDepth < maxDepth) {
                    try {
                        children = await buildTreeStructure(hubId, projectId, item.id, searchTerm, maxDepth, currentDepth + 1);
                        // Only mark as having children if we actually found some
                        if (children && children.length > 0) {
                            metadata.hasChildren = true;
                        }
                    } catch (err) {
                        console.error(`Error getting folder contents for ${item.id}:`, err.message);
                        // Continue without children if there's an error
                    }
                }
                
                const itemNode = buildTreeNode(
                    isFolder ? `folder|${hubId}|${projectId}|${item.id}` : `item|${hubId}|${projectId}|${item.id}`,
                    itemName,
                    isFolder ? 'folder' : 'item',
                    children !== null ? (children && children.length > 0) : isFolder,
                    metadata
                );
                
                // Add children if we have them
                if (children && children.length > 0) {
                    itemNode.children = children;
                }
                
                tree.push(itemNode);
            }
        }
    } catch (error) {
        console.error('Error building tree structure:', error);
        throw error;
    }

    return tree;
}

/**
 * Search for a specific item by name across all hubs
 */
async function searchItem(searchTerm, type = 'all') {
    const token = await getAccessToken();
    const results = [];

    try {
        const hubs = await getHubs(token);
        for (const hub of hubs) {
            const hubName = hub.attributes.name;
            if (type === 'all' || type === 'hub') {
                if (hubName.toLowerCase().includes(searchTerm.toLowerCase())) {
                    results.push({
                        type: 'hub',
                        id: hub.id,
                        name: hubName,
                        path: hubName
                    });
                }
            }

            if (type === 'all' || type === 'project' || type === 'file') {
                const projects = await getProjects(hub.id, token);
                for (const project of projects) {
                    const projectName = project.attributes.name;
                    if (type === 'all' || type === 'project') {
                        if (projectName.toLowerCase().includes(searchTerm.toLowerCase())) {
                            results.push({
                                type: 'project',
                                id: project.id,
                                name: projectName,
                                path: `${hubName} > ${projectName}`,
                                hubId: hub.id
                            });
                        }
                    }

                    if (type === 'all' || type === 'file') {
                        // Search in project contents
                        const contents = await getProjectContents(hub.id, project.id, null, token);
                        for (const item of contents) {
                            const itemName = item.attributes.displayName;
                            if (itemName.toLowerCase().includes(searchTerm.toLowerCase())) {
                                results.push({
                                    type: item.type === 'folders' ? 'folder' : 'file',
                                    id: item.id,
                                    name: itemName,
                                    path: `${hubName} > ${projectName} > ${itemName}`,
                                    hubId: hub.id,
                                    projectId: project.id,
                                    isFolder: item.type === 'folders'
                                });
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error searching items:', error);
        throw error;
    }

    return results;
}

/**
 * Get versions for an item and return the first version URN
 */
async function getItemVersionUrn(hubId, projectId, itemId) {
    const token = await getAccessToken();
    try {
        const versions = await getItemVersions(projectId, itemId, token);
        if (versions && versions.length > 0) {
            // The version ID can be used as URN (base64 encoded)
            return versions[0].id;
        }
        return null;
    } catch (error) {
        console.error('Error getting item version:', error);
        return null;
    }
}

// Create MCP Server
const server = new Server(
    {
        name: 'aps-hubs-browser',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
            resources: {},
        },
    }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'list_hubs',
            description: 'List all Fusion Hubs available to the authenticated user',
            inputSchema: {
                type: 'object',
                properties: {
                    search: {
                        type: 'string',
                        description: 'Optional search term to filter hubs by name',
                    },
                },
            },
        },
        {
            name: 'list_projects',
            description: 'List all projects in a specific hub',
            inputSchema: {
                type: 'object',
                properties: {
                    hubId: {
                        type: 'string',
                        description: 'The hub ID to list projects from',
                    },
                    search: {
                        type: 'string',
                        description: 'Optional search term to filter projects by name',
                    },
                },
                required: ['hubId'],
            },
        },
        {
            name: 'list_files',
            description: 'List files and folders in a project or folder',
            inputSchema: {
                type: 'object',
                properties: {
                    hubId: {
                        type: 'string',
                        description: 'The hub ID',
                    },
                    projectId: {
                        type: 'string',
                        description: 'The project ID',
                    },
                    folderId: {
                        type: 'string',
                        description: 'Optional folder ID to list contents of a specific folder',
                    },
                    search: {
                        type: 'string',
                        description: 'Optional search term to filter files by name',
                    },
                },
                required: ['hubId', 'projectId'],
            },
        },
        {
            name: 'search_hubs',
            description: 'Search for hubs, projects, or files by name across all hubs',
            inputSchema: {
                type: 'object',
                properties: {
                    searchTerm: {
                        type: 'string',
                        description: 'The search term to find items by name',
                    },
                    type: {
                        type: 'string',
                        enum: ['all', 'hub', 'project', 'file'],
                        description: 'Type of item to search for (default: all)',
                        default: 'all',
                    },
                },
                required: ['searchTerm'],
            },
        },
        {
            name: 'get_file_viewer_urn',
            description: 'Get the URN for viewing a specific file version in the Autodesk Viewer',
            inputSchema: {
                type: 'object',
                properties: {
                    hubId: {
                        type: 'string',
                        description: 'The hub ID',
                    },
                    projectId: {
                        type: 'string',
                        description: 'The project ID',
                    },
                    itemId: {
                        type: 'string',
                        description: 'The item ID to get the viewer URN for',
                    },
                },
                required: ['hubId', 'projectId', 'itemId'],
            },
        },
        {
            name: 'handle_prompt',
            description: 'Handle natural language prompts about Fusion Hubs, Projects, and Files. Examples: "Show me the contents of my Fusion Hubs", "Show me my Fusion model named Words"',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The natural language query from the user',
                    },
                },
                required: ['query'],
            },
        },
    ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'list_hubs': {
                const hubs = await buildTreeStructure(null, null, null, args?.search);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(hubs, null, 2),
                        },
                    ],
                };
            }

            case 'list_projects': {
                if (!args?.hubId) {
                    throw new Error('hubId is required');
                }
                const projects = await buildTreeStructure(args.hubId, null, null, args?.search);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(projects, null, 2),
                        },
                    ],
                };
            }

            case 'list_files': {
                if (!args?.hubId || !args?.projectId) {
                    throw new Error('hubId and projectId are required');
                }
                const files = await buildTreeStructure(args.hubId, args.projectId, args?.folderId, args?.search);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(files, null, 2),
                        },
                    ],
                };
            }

            case 'search_hubs': {
                if (!args?.searchTerm) {
                    throw new Error('searchTerm is required');
                }
                const results = await searchItem(args.searchTerm, args?.type || 'all');
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(results, null, 2),
                        },
                    ],
                };
            }

            case 'get_file_viewer_urn': {
                if (!args?.hubId || !args?.projectId || !args?.itemId) {
                    throw new Error('hubId, projectId, and itemId are required');
                }
                const urn = await getItemVersionUrn(args.hubId, args.projectId, args.itemId);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ urn, itemId: args.itemId }, null, 2),
                        },
                    ],
                };
            }

            case 'handle_prompt': {
                if (!args?.query) {
                    throw new Error('query is required');
                }
                const parsed = parseQuery(args.query);
                
                if (parsed.searchTerm) {
                    // Search for specific item
                    const results = await searchItem(parsed.searchTerm, parsed.type);
                    
                    if (results.length === 0) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `No items found matching "${parsed.searchTerm}"`,
                                },
                            ],
                        };
                    }

                    // If a specific file was found, get its URN and build a focused tree
                    const fileResult = results.find(r => r.type === 'file' && !r.isFolder);
                    if (fileResult) {
                        const urn = await getItemVersionUrn(fileResult.hubId, fileResult.projectId, fileResult.id);
                        const tree = await buildTreeStructure(fileResult.hubId, fileResult.projectId, null, parsed.searchTerm);
                        
                        // Mark the found item in the tree
                        const markFoundItem = (nodes) => {
                            for (const node of nodes) {
                                if (node.itemId === fileResult.id) {
                                    node.selected = true;
                                    node.viewerUrn = urn;
                                }
                                if (node.children && Array.isArray(node.children)) {
                                    markFoundItem(node.children);
                                }
                            }
                        };
                        markFoundItem(tree);

                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        query: args.query,
                                        found: fileResult,
                                        urn,
                                        tree,
                                    }, null, 2),
                                },
                            ],
                        };
                    }

                    // Return search results
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    query: args.query,
                                    results,
                                }, null, 2),
                            },
                        ],
                    };
                } else {
                    // No search term - return full tree
                    const tree = await buildTreeStructure();
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    query: args.query,
                                    tree,
                                }, null, 2),
                            },
                        ],
                    };
                }
            }

            case 'browse_hubs': {
                const hubs = await buildTreeStructure(null, null, null, args?.search);
                const htmlContent = createHubBrowserHTML(hubs, args?.search || '');
                return {
                    content: [
                        createUIResource({
                            uri: 'ui://aps-hubs/browser',
                            name: 'Hub Browser',
                            mimeType: 'text/html',
                            text: htmlContent,
                        }),
                        {
                            type: 'text',
                            text: `Opened interactive hub browser with ${hubs.length} hub(s). Use the search box to filter hubs.`,
                        },
                    ],
                };
            }

            case 'browse_projects': {
                if (!args?.hubId) {
                    throw new Error('hubId is required');
                }
                const tree = await buildTreeStructure(args.hubId, args?.projectId || null, null);
                const htmlContent = createProjectTreeHTML(tree, args.hubId, args?.projectId || null);
                return {
                    content: [
                        createUIResource({
                            uri: `ui://aps-project/tree?hubId=${encodeURIComponent(args.hubId)}${args?.projectId ? `&projectId=${encodeURIComponent(args.projectId)}` : ''}`,
                            name: 'Project Tree',
                            mimeType: 'text/html',
                            text: htmlContent,
                        }),
                        {
                            type: 'text',
                            text: `Opened interactive project tree for hub ${args.hubId}. Click nodes to expand/collapse.`,
                        },
                    ],
                };
            }

            case 'view_item': {
                if (!args?.hubId || !args?.projectId || !args?.itemId) {
                    throw new Error('hubId, projectId, and itemId are required');
                }
                const token = await getAccessToken();
                
                /**
                 * Recursively search for an item by ID in project contents
                 */
                async function findItemRecursively(hubId, projectId, folderId, itemId, token) {
                    const contents = await getProjectContents(hubId, projectId, folderId, token);
                    
                    // Check top level
                    const item = contents.find(c => c.id === itemId);
                    if (item) {
                        return item;
                    }
                    
                    // Recursively search in folders
                    for (const content of contents) {
                        if (content.type === 'folders') {
                            try {
                                const found = await findItemRecursively(hubId, projectId, content.id, itemId, token);
                                if (found) {
                                    return found;
                                }
                            } catch (err) {
                                // Continue searching other folders
                                console.error(`Error searching in folder ${content.id}:`, err.message);
                            }
                        }
                    }
                    
                    return null;
                }
                
                // Find the item recursively
                const item = await findItemRecursively(args.hubId, args.projectId, null, args.itemId, token);
                
                if (!item) {
                    throw new Error(`Item ${args.itemId} not found in project ${args.projectId}`);
                }
                
                const isFolder = item.type === 'folders';
                
                // Get versions (only for files, not folders)
                let versions = [];
                if (!isFolder) {
                    try {
                        versions = await getItemVersions(args.projectId, args.itemId, token);
                    } catch (err) {
                        console.error('Error getting versions:', err);
                    }
                } else {
                    // For folders, get folder contents instead
                    try {
                        const folderContents = await getProjectContents(args.hubId, args.projectId, args.itemId, token);
                        // Convert folder contents to a "versions-like" display
                        versions = folderContents.map((content, idx) => ({
                            id: content.id,
                            createTime: content.attributes?.createTime || content.attributes?.lastModifiedTime || 'N/A',
                            name: content.attributes?.displayName || 'Unknown',
                            type: content.type
                        }));
                    } catch (err) {
                        console.error('Error getting folder contents:', err);
                    }
                }
                
                const htmlContent = createItemViewerHTML(item, versions, isFolder);
                return {
                    content: [
                        createUIResource({
                            uri: `ui://aps-item/viewer?hubId=${encodeURIComponent(args.hubId)}&projectId=${encodeURIComponent(args.projectId)}&itemId=${encodeURIComponent(args.itemId)}`,
                            name: isFolder ? 'Folder Viewer' : 'Item Viewer',
                            mimeType: 'text/html',
                            text: htmlContent,
                        }),
                        {
                            type: 'text',
                            text: `Opened ${isFolder ? 'folder' : 'item'} viewer for ${item.attributes?.displayName || args.itemId}. ${isFolder ? `Found ${versions.length} item(s) in folder.` : `Found ${versions.length} version(s).`}`,
                        },
                    ],
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
        {
            uri: 'aps://hubs',
            name: 'Fusion Hubs',
            description: 'Tree view of all Fusion Hubs, Projects, and Files',
            mimeType: 'application/json',
        },
        {
            uri: 'aps://hubs/{hubId}',
            name: 'Hub Projects',
            description: 'Tree view of projects in a specific hub',
            mimeType: 'application/json',
        },
        {
            uri: 'aps://hubs/{hubId}/projects/{projectId}',
            name: 'Project Contents',
            description: 'Tree view of files and folders in a project',
            mimeType: 'application/json',
        },
    ],
}));

// Handle resource reads
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
        // Parse URI: aps://hubs[/{hubId}[/projects/{projectId}[/{folderId}]]]
        const match = uri.match(/^aps:\/\/hubs(?:\/([^\/]+))?(?:\/projects\/([^\/]+))?(?:\/([^\/]+))?$/);
        
        if (!match) {
            throw new Error(`Invalid resource URI: ${uri}`);
        }

        const [, hubId, projectId, folderId] = match;
        const tree = await buildTreeStructure(hubId || null, projectId || null, folderId || null);

        return {
            contents: [
                {
                    uri,
                    mimeType: 'application/json',
                    text: JSON.stringify(tree, null, 2),
                },
            ],
        };
    } catch (error) {
        return {
            contents: [
                {
                    uri,
                    mimeType: 'text/plain',
                    text: `Error: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
});

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('APS Hubs Browser MCP server running on stdio');
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

