#!/usr/bin/env node

/**
 * Display Fusion Hubs with Hub IDs, Project IDs, and Folder IDs
 */

const { getHubs, getProjects, getProjectContents } = require('./services/aps.js');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const PORT = process.env.PORT || 8080;

/**
 * Get access token from environment or server
 */
async function getAccessToken() {
    const envToken = process.env.APS_ACCESS_TOKEN;
    if (envToken) {
        return envToken;
    }

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

async function displayHubsWithFolderIds() {
    try {
        const token = await getAccessToken();
        console.log('Fetching Fusion Hubs with Folder IDs...\n');
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
            
            // Get projects for this hub
            try {
                const projects = await getProjects(hub.id, token);
                console.log(`   Projects: ${projects.length}\n`);
                
                if (projects.length > 0) {
                    for (let j = 0; j < projects.length; j++) {
                        const project = projects[j];
                        const projectName = project.attributes.name;
                        console.log(`   📁 Project: ${projectName}`);
                        console.log(`      Project ID: ${project.id}`);
                        
                        // Get top-level contents (folders and items)
                        try {
                            const contents = await getProjectContents(hub.id, project.id, null, token);
                            
                            // Separate folders and items
                            const folders = contents.filter(item => item.type === 'folders');
                            const items = contents.filter(item => item.type !== 'folders');
                            
                            if (folders.length > 0) {
                                console.log(`      Folders (${folders.length}):`);
                                folders.forEach(folder => {
                                    console.log(`         📁 ${folder.attributes.displayName}`);
                                    console.log(`            Folder ID: ${folder.id}`);
                                });
                            }
                            
                            if (items.length > 0) {
                                console.log(`      Files (${items.length}):`);
                                items.slice(0, 5).forEach(item => {
                                    console.log(`         📄 ${item.attributes.displayName}`);
                                    console.log(`            Item ID: ${item.id}`);
                                });
                                if (items.length > 5) {
                                    console.log(`         ... and ${items.length - 5} more files`);
                                }
                            }
                            
                            if (folders.length === 0 && items.length === 0) {
                                console.log(`      (Empty project)`);
                            }
                            
                        } catch (err) {
                            console.log(`      Error loading contents: ${err.message}`);
                        }
                        
                        console.log('');
                    }
                }
            } catch (err) {
                console.log(`   Error loading projects: ${err.message}`);
            }
            
            if (i < hubs.length - 1) {
                console.log('─'.repeat(80));
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

displayHubsWithFolderIds();

