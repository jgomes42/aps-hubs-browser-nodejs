#!/usr/bin/env node

/**
 * Display Fusion Hubs using the same logic as the MCP server
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
        
        return data.access_token;
    } catch (error) {
        // Fall through to error message
        throw new Error(
            'Could not get access token. Please either:\n' +
            '  1. Set APS_ACCESS_TOKEN environment variable, or\n' +
            '  2. Authenticate via the web app at http://localhost:' + PORT + '/api/auth/login\n' +
            '     Then set APS_SESSION_COOKIE environment variable with your session cookie.'
        );
    }
}

async function displayHubs() {
    try {
        const token = await getAccessToken();
        console.log('Fetching your Fusion Hubs...\n');
        const hubs = await getHubs(token);
        
        if (hubs.length === 0) {
            console.log('No hubs found.');
            return;
        }
        
        console.log(`Found ${hubs.length} hub(s):\n`);
        console.log('═'.repeat(60));
        
        for (let i = 0; i < hubs.length; i++) {
            const hub = hubs[i];
            const hubName = hub.attributes.name;
            console.log(`\n${i + 1}. ${hubName}`);
            console.log(`   ID: ${hub.id}`);
            console.log(`   Type: ${hub.type}`);
            
            // Get projects for this hub
            try {
                const projects = await getProjects(hub.id, token);
                console.log(`   Projects: ${projects.length}`);
                
                if (projects.length > 0) {
                    for (let j = 0; j < Math.min(projects.length, 5); j++) {
                        const project = projects[j];
                        console.log(`      - ${project.attributes.name} (${project.id})`);
                        
                        // Get top-level contents for first project as example
                        if (j === 0) {
                            try {
                                const contents = await getProjectContents(hub.id, project.id, null, token);
                                if (contents.length > 0) {
                                    console.log(`        Contents: ${contents.length} items`);
                                    contents.slice(0, 3).forEach(item => {
                                        const icon = item.type === 'folders' ? '📁' : '📄';
                                        console.log(`          ${icon} ${item.attributes.displayName}`);
                                    });
                                    if (contents.length > 3) {
                                        console.log(`          ... and ${contents.length - 3} more`);
                                    }
                                }
                            } catch (err) {
                                // Ignore errors getting contents
                            }
                        }
                    }
                    if (projects.length > 5) {
                        console.log(`      ... and ${projects.length - 5} more projects`);
                    }
                }
            } catch (err) {
                console.log(`   Error loading projects: ${err.message}`);
            }
            
            if (i < hubs.length - 1) {
                console.log('\n' + '─'.repeat(60));
            }
        }
        
        console.log('\n' + '═'.repeat(60));
        console.log(`\nTotal: ${hubs.length} hub(s)`);
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.error('\nYour access token may have expired. Please re-authenticate.');
        }
        process.exit(1);
    }
}

displayHubs();

