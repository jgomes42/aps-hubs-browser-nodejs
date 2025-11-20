/**
 * MCP UI Routes
 * Handles UI resource fetching and action processing
 */

const express = require('express');
const { getUIResource, listUIResources } = require('../server/mcpUiResources/uiResources.js');
const { getProjects, getProjectContents, getItemVersions } = require('../services/aps.js');
const { authRefreshMiddleware } = require('../services/aps.js');
const { DataManagementClient } = require('@aps_sdk/data-management');

const router = express.Router();

// CORS middleware for cross-origin requests from React app
// Note: App-level CORS is also configured in server.js for /mcp-ui routes
// This router-level middleware is redundant but kept for safety
router.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Allow requests from React app (port 3000) or same origin (port 8080)
    if (origin && (origin.startsWith('http://localhost:3000') || origin.startsWith('http://localhost:8080'))) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    } else if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    } else {
        res.header('Access-Control-Allow-Origin', '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

/**
 * GET /mcp-ui/api/item/:projectId/:itemId/versions
 * Get all versions for a specific item
 * Used by the standalone version viewer
 * 
 * NOTE: This route must be defined BEFORE the /resource/* route to ensure it matches
 */
router.get('/api/item/:projectId/:itemId/versions', authRefreshMiddleware, async (req, res) => {
    try {
        const { projectId, itemId } = req.params;
        
        // Decode URL-encoded parameters (Express should do this automatically, but just in case)
        const decodedProjectId = decodeURIComponent(projectId);
        const decodedItemId = decodeURIComponent(itemId);
        
        // Check authentication
        if (!req.internalOAuthToken || !req.internalOAuthToken.access_token) {
            return res.status(401).json({
                status: 'error',
                error: 'Authentication required. Please log in first.'
            });
        }
        
        const token = req.internalOAuthToken.access_token;
        
        console.log('Fetching versions for item:', { 
            projectId: decodedProjectId, 
            itemId: decodedItemId,
            rawProjectId: projectId,
            rawItemId: itemId
        });
        
        // Get versions
        const versions = await getItemVersions(decodedProjectId, decodedItemId, token);
        
        // Try to get item name from version data or itemId
        let itemName = 'Unknown Item';
        try {
            // Try to extract item name from the first version's relationships or attributes
            if (versions && versions.length > 0) {
                const firstVersion = versions[0];
                // Versions might have item relationship data
                if (firstVersion.relationships && firstVersion.relationships.item) {
                    // Try to get name from item relationship
                    const itemData = firstVersion.relationships.item.data;
                    if (itemData && itemData.attributes && itemData.attributes.displayName) {
                        itemName = itemData.attributes.displayName;
                    }
                }
                // If still not found, try to get from version's itemName attribute
                if (itemName === 'Unknown Item' && firstVersion.attributes?.itemName) {
                    itemName = firstVersion.attributes.itemName;
                }
            }
            
            // Fallback: try to extract readable name from itemId
            if (itemName === 'Unknown Item') {
                // Try to decode or extract name from itemId
                // ItemId format is usually: urn:adsk.wipprod:dm.lineage:xxx
                // We can use a shortened version for display
                const parts = decodedItemId.split(':');
                if (parts.length > 0) {
                    itemName = `Item ${parts[parts.length - 1].substring(0, 8)}...`;
                } else {
                    itemName = decodedItemId.substring(0, 50);
                }
            }
        } catch (err) {
            console.warn('Could not extract item name:', err.message);
            // Use shortened itemId as fallback
            itemName = decodedItemId.length > 50 ? decodedItemId.substring(0, 50) + '...' : decodedItemId;
        }
        
        // Format versions for the frontend
        const formattedVersions = versions.map(version => ({
            id: version.id,
            name: version.attributes?.displayName || 
                  version.attributes?.name || 
                  version.id,
            createTime: version.attributes?.createTime || 
                       version.attributes?.lastModifiedTime || 
                       'N/A',
            versionNumber: version.attributes?.versionNumber,
            attributes: version.attributes
        }));
        
        res.json({
            status: 'ok',
            itemId: decodedItemId,
            itemName: itemName,
            versions: formattedVersions
        });
    } catch (error) {
        console.error('Error fetching item versions:', error);
        res.status(500).json({
            status: 'error',
            error: error.message || 'Failed to fetch versions'
        });
    }
});

/**
 * GET /mcp-ui/resource/*
 * Fetch a UI resource by ID
 * 
 * Query params can include data to pass to the resource:
 * - projectId, hubId, folderId, etc.
 * 
 * Note: This endpoint requires authentication (session cookie)
 * 
 * Uses regex pattern to match resourceId with slashes (e.g., "project/info")
 */
router.get(/^\/resource\/(.+)$/, async (req, res, next) => {
    // Extract resourceId from the regex match (everything after /resource/)
    // req.params[0] contains the first captured group from the regex
    const resourceId = req.params[0] || req.path.replace(/^\/resource\//, '').split('?')[0];
    
    if (!resourceId) {
        return res.status(400).json({ error: 'Resource ID is required' });
    }
    
    // Check authentication first, but don't fail if not authenticated (for testing)
    let authenticated = false;
    try {
        await new Promise((resolve, reject) => {
            authRefreshMiddleware(req, res, (err) => {
                if (err) reject(err);
                else {
                    authenticated = !!req.internalOAuthToken;
                    resolve();
                }
            });
        });
    } catch (err) {
        // Auth failed, but continue anyway for testing
        console.log('Auth check failed, continuing without auth:', err.message);
    }
    
    try {
        const queryData = req.query;
        
        console.log('Fetching MCP-UI resource:', resourceId, 'with data:', queryData, 'authenticated:', authenticated);
        
        // Parse query params into data object
        const data = {
            projectId: queryData.projectId,
            projectName: queryData.projectName,
            hubId: queryData.hubId,
            hubName: queryData.hubName,
            folderId: queryData.folderId,
            folderName: queryData.folderName,
            projectCount: queryData.projectCount ? parseInt(queryData.projectCount) : undefined,
        };
        
        // Get the UI resource
        const resource = getUIResource(resourceId, data);
        
        // createUIResource returns { type: 'resource', resource: {...} }
        // Return the resource object for the client
        console.log('Returning resource:', resource.resource?.uri || resource.uri);
        res.json(resource.resource || resource);
    } catch (error) {
        console.error('Error fetching MCP-UI resource:', error);
        if (error.message.includes('Unknown UI resource')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * GET /mcp-ui/resources
 * List all available UI resource IDs
 */
router.get('/resources', (req, res) => {
    const resources = listUIResources();
    res.json({ resources });
});

/**
 * POST /mcp-ui/action
 * Handle UI actions from MCP UI components
 * 
 * Expected body:
 * {
 *   type: 'tool' | 'intent' | etc.,
 *   payload: {
 *     toolName: string,
 *     params: object
 *   }
 * }
 */
router.post('/action', authRefreshMiddleware, express.json(), async (req, res, next) => {
    try {
        const action = req.body;
        
        // Check if we have authentication token
        if (!req.internalOAuthToken || !req.internalOAuthToken.access_token) {
            return res.status(401).json({
                status: 'error',
                error: 'Authentication required. Please log in first.'
            });
        }
        
        const token = req.internalOAuthToken.access_token;
        
        console.log('Received UI action:', action);
        
        // Helper function to check if IDs are demo/test data
        const isDemoData = (id) => {
            return !id || id.startsWith('demo-') || id === 'demo-hub-id' || id === 'demo-project-id';
        };
        
        // Handle different action types
        if (action.type === 'tool') {
            const { toolName, params } = action.payload;
            
            let result;
            
            switch (toolName) {
                case 'refreshProject':
                    // Refresh project data
                    if (!params.hubId || !params.projectId) {
                        result = { status: 'error', error: 'Missing hubId or projectId' };
                    } else if (isDemoData(params.hubId) || isDemoData(params.projectId)) {
                        result = { 
                            status: 'error', 
                            error: 'Demo data cannot be refreshed. Please select a real project from the tree.'
                        };
                    } else {
                        try {
                            const projects = await getProjects(params.hubId, token);
                            const project = projects.find(p => p.id === params.projectId);
                            if (!project) {
                                result = {
                                    status: 'error',
                                    error: `Project ${params.projectId} not found in hub ${params.hubId}`
                                };
                            } else {
                                result = {
                                    status: 'ok',
                                    data: {
                                        projectId: project.id,
                                        projectName: project.attributes?.name,
                                        hubId: params.hubId
                                    }
                                };
                            }
                        } catch (apiError) {
                            console.error('API error in refreshProject:', apiError);
                            result = {
                                status: 'error',
                                error: apiError.message || 'Failed to refresh project data. Please check the console for details.'
                            };
                        }
                    }
                    break;
                    
                case 'refreshFolder':
                    // Refresh folder contents
                    console.log('refreshFolder params:', params);
                    if (!params.hubId || !params.projectId || !params.folderId) {
                        const missing = [];
                        if (!params.hubId) missing.push('hubId');
                        if (!params.projectId) missing.push('projectId');
                        if (!params.folderId) missing.push('folderId');
                        result = { 
                            status: 'error', 
                            error: `Missing required parameters: ${missing.join(', ')}. Received: hubId=${params.hubId}, projectId=${params.projectId}, folderId=${params.folderId}`
                        };
                    } else if (isDemoData(params.hubId) || isDemoData(params.projectId) || isDemoData(params.folderId)) {
                        result = { 
                            status: 'error', 
                            error: 'Demo data cannot be refreshed. Please select a real folder from the tree.'
                        };
                    } else {
                        try {
                            const contents = await getProjectContents(
                                params.hubId,
                                params.projectId,
                                params.folderId,
                                token
                            );
                            
                            // Fetch versions for each file item
                            const itemsWithVersions = await Promise.all(
                                contents.slice(0, 20).map(async (item) => {
                                    const isFolder = item.type === 'folders';
                                    const itemData = {
                                        id: item.id,
                                        name: item.attributes?.displayName || 'Unknown',
                                        type: item.type,
                                        attributes: item.attributes
                                    };
                                    
                                    // For files, fetch versions
                                    if (!isFolder) {
                                        try {
                                            const versions = await getItemVersions(params.projectId, item.id, token);
                                            if (versions && versions.length > 0) {
                                                itemData.versions = versions.map(version => ({
                                                    id: version.id,
                                                    name: version.attributes?.displayName || 
                                                          version.attributes?.name || 
                                                          version.id,
                                                    createTime: version.attributes?.createTime || 
                                                               version.attributes?.lastModifiedTime || 
                                                               'N/A',
                                                    versionNumber: version.attributes?.versionNumber
                                                }));
                                            }
                                        } catch (versionError) {
                                            console.error(`Error fetching versions for item ${item.id}:`, versionError.message);
                                            // Continue without versions
                                        }
                                    }
                                    
                                    return itemData;
                                })
                            );
                            
                            result = {
                                status: 'ok',
                                data: {
                                    itemCount: contents.length,
                                    items: itemsWithVersions
                                }
                            };
                        } catch (apiError) {
                            console.error('API error in refreshFolder:', apiError);
                            result = {
                                status: 'error',
                                error: apiError.message || 'Failed to refresh folder contents. Please check the console for details.'
                            };
                        }
                    }
                    break;
                    
                case 'createItem':
                    // Create new item (placeholder - would need APS API for actual creation)
                    result = {
                        status: 'ok',
                        message: 'Item creation not yet implemented. This would call APS API to create a new item.'
                    };
                    break;
                    
                case 'getFolderDetails':
                    // Get folder details
                    console.log('getFolderDetails params:', params);
                    if (!params.hubId || !params.projectId || !params.folderId) {
                        const missing = [];
                        if (!params.hubId) missing.push('hubId');
                        if (!params.projectId) missing.push('projectId');
                        if (!params.folderId) missing.push('folderId');
                        result = { 
                            status: 'error', 
                            error: `Missing required parameters: ${missing.join(', ')}. Received: hubId=${params.hubId}, projectId=${params.projectId}, folderId=${params.folderId}`
                        };
                    } else if (isDemoData(params.hubId) || isDemoData(params.projectId) || isDemoData(params.folderId)) {
                        result = { 
                            status: 'error', 
                            error: 'Demo data cannot be queried. Please select a real folder from the tree.'
                        };
                    } else {
                        try {
                            const contents = await getProjectContents(
                                params.hubId,
                                params.projectId,
                                params.folderId,
                                token
                            );
                            
                            // Fetch versions for each file item
                            const itemsWithVersions = await Promise.all(
                                contents.slice(0, 20).map(async (item) => {
                                    const isFolder = item.type === 'folders';
                                    const itemData = {
                                        id: item.id,
                                        name: item.attributes?.displayName || 'Unknown',
                                        type: item.type,
                                        attributes: item.attributes
                                    };
                                    
                                    // For files, fetch versions
                                    if (!isFolder) {
                                        try {
                                            const versions = await getItemVersions(params.projectId, item.id, token);
                                            if (versions && versions.length > 0) {
                                                itemData.versions = versions.map(version => ({
                                                    id: version.id,
                                                    name: version.attributes?.displayName || 
                                                          version.attributes?.name || 
                                                          version.id,
                                                    createTime: version.attributes?.createTime || 
                                                               version.attributes?.lastModifiedTime || 
                                                               'N/A',
                                                    versionNumber: version.attributes?.versionNumber
                                                }));
                                            }
                                        } catch (versionError) {
                                            console.error(`Error fetching versions for item ${item.id}:`, versionError.message);
                                            // Continue without versions
                                        }
                                    }
                                    
                                    return itemData;
                                })
                            );
                            
                            result = {
                                status: 'ok',
                                data: {
                                    folderId: params.folderId,
                                    itemCount: contents.length,
                                    items: itemsWithVersions
                                }
                            };
                        } catch (apiError) {
                            console.error('API error in getFolderDetails:', apiError);
                            result = {
                                status: 'error',
                                error: apiError.message || 'Failed to get folder details. Please check the console for details.'
                            };
                        }
                    }
                    break;
                    
                default:
                    result = {
                        status: 'error',
                        error: `Unknown tool: ${toolName}`
                    };
            }
            
            res.json(result);
        } else if (action.type === 'intent') {
            // Handle intent-based actions
            const { intent, params } = action.payload || {};
            
            switch (intent) {
                case 'view_version':
                    // Handle version viewing intent - get viewer URN for the version
                    console.log('view_version intent:', params);
                    
                    if (!params.itemId || !params.versionId || !params.projectId) {
                        res.json({
                            status: 'error',
                            error: 'Missing required parameters: itemId, versionId, or projectId'
                        });
                        return;
                    }
                    
                    try {
                        // For viewing, we should use the itemId (lineage URN) not the versionId
                        // The itemId format is: urn:adsk.wipprod:dm.lineage:xxx
                        // This is what the viewer expects - the lineage URN represents the item
                        // The version is automatically the latest or can be specified
                        const token = req.internalOAuthToken.access_token;
                        
                        // Use itemId as the viewer URN (this is what the tree uses when clicking files)
                        // The itemId is the lineage URN which is what Autodesk Viewer needs
                        let viewerUrn = params.itemId;
                        
                        if (!viewerUrn) {
                            // Fallback: try to extract from versionId if itemId not provided
                            viewerUrn = params.versionId;
                            if (viewerUrn.includes('?')) {
                                viewerUrn = viewerUrn.split('?')[0];
                            }
                        }
                        
                        console.log('Viewer URN for version:', {
                            itemId: params.itemId,
                            versionId: params.versionId,
                            viewerUrn: viewerUrn
                        });
                        
                        res.json({
                            status: 'ok',
                            message: 'Version view intent received',
                            data: {
                                intent: 'view_version',
                                itemId: params.itemId,
                                versionId: params.versionId,
                                versionName: params.versionName,
                                hubId: params.hubId,
                                projectId: params.projectId,
                                viewerUrn: viewerUrn, // Use itemId (lineage URN) for viewing
                                viewerUrl: `https://aps.autodesk.com/viewers/viewer.html?urn=${encodeURIComponent(viewerUrn)}`
                            }
                        });
                    } catch (error) {
                        console.error('Error handling view_version intent:', error);
                        res.json({
                            status: 'error',
                            error: error.message || 'Failed to process version view intent'
                        });
                    }
                    break;
                    
                default:
                    res.json({
                        status: 'ok',
                        message: `Intent '${intent}' received but not yet implemented`
                    });
            }
        } else {
            res.status(400).json({
                status: 'error',
                error: `Unknown action type: ${action.type}`
            });
        }
    } catch (error) {
        console.error('Error handling UI action:', error);
        // Always return JSON, never HTML
        res.status(500).json({
            status: 'error',
            error: error.message || 'An unexpected error occurred while processing the action'
        });
    }
});

/**
 * In-memory store for viewer load requests from React app
 * Key: session ID or timestamp, Value: viewer load request data
 */
const viewerLoadRequests = new Map();

/**
 * POST /mcp-ui/notify-viewer-load
 * Receives viewer load requests from React app (cross-origin)
 * Stores the request so the main app can poll for it
 */
router.post('/notify-viewer-load', express.json(), (req, res) => {
    try {
        const request = req.body;
        
        if (!request || !request.type || request.type !== 'load-viewer-version') {
            return res.status(400).json({
                status: 'error',
                error: 'Invalid request format. Expected type: load-viewer-version'
            });
        }
        
        // Store the request with a timestamp key
        const requestId = Date.now().toString();
        viewerLoadRequests.set(requestId, {
            ...request,
            timestamp: Date.now()
        });
        
        // Clean up old requests (older than 30 seconds)
        const now = Date.now();
        for (const [id, req] of viewerLoadRequests.entries()) {
            if (now - req.timestamp > 30000) {
                viewerLoadRequests.delete(id);
            }
        }
        
        console.log('Stored viewer load request:', requestId, request);
        
        res.json({
            status: 'ok',
            requestId: requestId,
            message: 'Viewer load request stored'
        });
    } catch (error) {
        console.error('Error storing viewer load request:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * GET /mcp-ui/poll-viewer-load
 * Main app polls this endpoint to check for viewer load requests
 * Returns the most recent request and removes it from the store
 */
router.get('/poll-viewer-load', (req, res) => {
    try {
        // Get the most recent request
        let latestRequest = null;
        let latestId = null;
        let latestTimestamp = 0;
        
        // Log total requests in store (for debugging)
        const requestCount = viewerLoadRequests.size;
        if (requestCount > 0) {
            console.log(`Polling: Found ${requestCount} request(s) in store`);
        }
        
        for (const [id, request] of viewerLoadRequests.entries()) {
            if (request.timestamp > latestTimestamp) {
                latestTimestamp = request.timestamp;
                latestRequest = request;
                latestId = id;
            }
        }
        
        if (latestRequest) {
            // Remove the request after returning it
            viewerLoadRequests.delete(latestId);
            console.log('Returning viewer load request to main app:', {
                requestId: latestId,
                itemId: latestRequest.itemId,
                versionId: latestRequest.versionId,
                versionName: latestRequest.versionName
            });
            res.json({
                status: 'ok',
                hasRequest: true,
                request: latestRequest
            });
        } else {
            res.json({
                status: 'ok',
                hasRequest: false
            });
        }
    } catch (error) {
        console.error('Error polling viewer load request:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

module.exports = router;

