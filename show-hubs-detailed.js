#!/usr/bin/env node

/**
 * Display detailed Fusion Hubs information including all folder IDs
 */

const { getHubs, getProjects, getProjectContents } = require('./services/aps.js');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { PORT } = require('./config.js');

/**
 * Get access token from environment or server
 */
async function getAccessToken() {
    // First try environment variable
    const envToken = process.env.APS_ACCESS_TOKEN;
    if (envToken) {
        return envToken;
    }

    // Try to get token from HTTP endpoint (if Express server is running)
    const serverUrl = process.env.APS_SERVER_URL || `http://localhost:${PORT}`;
    try {
        const url = new URL(`${serverUrl}/api/auth/mcp-token`);
        const client = url.protocol === 'https:' ? https : http;
        
        const data = await new Promise((resolve, reject) => {
            const req = client.get(url, {
                headers: {
                    'Cookie': process.env.APS_SESSION_COOKIE || '',
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
        
        return data.access_token;
    } catch (error) {
        throw new Error(
            'Could not get access token. Please either:\n' +
            '  1. Set APS_ACCESS_TOKEN environment variable, or\n' +
            '  2. Authenticate via the web app at http://localhost:' + PORT + '/api/auth/login'
        );
    }
}

/**
 * Recursively get all folders in a project
 */
async function getAllFolders(hubId, projectId, folderId, token, indent = 0) {
    const folders = [];
    const prefix = '  '.repeat(indent);
    
    try {
        const contents = await getProjectContents(hubId, projectId, folderId, token);
        
        for (const item of contents) {
            if (item.type === 'folders') {
                const folderInfo = {
                    id: item.id,
                    name: item.attributes.displayName,
                    path: item.attributes.displayName,
                    level: indent
                };
                folders.push(folderInfo);
                
                // Recursively get subfolders
                const subfolders = await getAllFolders(hubId, projectId, item.id, token, indent + 1);
                folders.push(...subfolders);
            }
        }
    } catch (err) {
        console.error(`${prefix}Error getting folder contents: ${err.message}`);
    }
    
    return folders;
}

async function displayHubsDetailed() {
    try {
        const token = await getAccessToken();
        console.log('Fetching detailed Fusion Hubs information...\n');
        const hubs = await getHubs(token);
        
        if (hubs.length === 0) {
            console.log('No hubs found.');
            return;
        }
        
        console.log(`Found ${hubs.length} hub(s):\n`);
        console.log('═'.repeat(80));
        
        for (let i = 0; i < hubs.length; i++) {
            const hub = hubs[i];
            const hubName = hub.attributes.name;
            console.log(`\n${i + 1}. ${hubName}`);
            console.log(`   Hub ID: ${hub.id}`);
            console.log(`   Type: ${hub.type}`);
            
            // Get projects for this hub
            try {
                const projects = await getProjects(hub.id, token);
                console.log(`   Projects: ${projects.length}`);
                
                if (projects.length > 0) {
                    for (let j = 0; j < projects.length; j++) {
                        const project = projects[j];
                        const projectName = project.attributes.name;
                        console.log(`\n   📁 Project: ${projectName}`);
                        console.log(`      Project ID: ${project.id}`);
                        
                        // Get all folders recursively
                        try {
                            console.log(`      Fetching folders...`);
                            const allFolders = await getAllFolders(hub.id, project.id, null, token, 0);
                            
                            if (allFolders.length > 0) {
                                console.log(`      Folders (${allFolders.length} total):`);
                                allFolders.forEach(folder => {
                                    const indent = '      ' + '  '.repeat(folder.level);
                                    console.log(`${indent}📁 ${folder.name}`);
                                    console.log(`${indent}   Folder ID: ${folder.id}`);
                                });
                            } else {
                                console.log(`      No folders found in this project.`);
                            }
                            
                            // Also show top-level items (non-folders)
                            const topContents = await getProjectContents(hub.id, project.id, null, token);
                            const topItems = topContents.filter(item => item.type !== 'folders');
                            if (topItems.length > 0) {
                                console.log(`      Top-level items (${topItems.length}):`);
                                topItems.forEach(item => {
                                    console.log(`         📄 ${item.attributes.displayName} (${item.id})`);
                                });
                            }
                        } catch (err) {
                            console.log(`      Error loading folders: ${err.message}`);
                        }
                    }
                }
            } catch (err) {
                console.log(`   Error loading projects: ${err.message}`);
            }
            
            if (i < hubs.length - 1) {
                console.log('\n' + '─'.repeat(80));
            }
        }
        
        console.log('\n' + '═'.repeat(80));
        console.log(`\nTotal: ${hubs.length} hub(s)`);
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.error('\nYour access token may have expired. Please re-authenticate.');
        }
        process.exit(1);
    }
}

displayHubsDetailed();

