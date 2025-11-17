/**
 * MCP UI Resources
 * Structured UI resources for the APS Hubs Browser
 */

const { createUIResource } = require('@mcp-ui/server');
const { createTreeViewHTML, createSearchResultsHTML } = require('../../ui-components.js');

/**
 * Project Info Panel UI Resource
 * Displays project metadata and actions
 */
function createProjectInfoPanel(projectData = {}) {
    const { projectId, projectName, hubId } = projectData;
    
    return createUIResource({
        uri: 'ui://project/info',
        name: 'Project Info',
        content: {
            type: 'rawHtml',
            htmlString: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="mcpui.dev/ui-preferred-frame-size" content="width=500,height=300">
    <title>Project Info</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 16px;
            background: #f5f5f5;
        }
        .panel {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h2 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #1a1a1a;
        }
        .info-row {
            display: flex;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .info-label {
            font-weight: 500;
            color: #666;
            width: 100px;
        }
        .info-value {
            color: #1a1a1a;
            flex: 1;
        }
        button {
            margin-top: 16px;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        button:hover {
            background: #0056b3;
        }
        #status {
            margin-top: 12px;
            padding: 8px;
            border-radius: 4px;
            display: none;
        }
        #status.success {
            background: #d4edda;
            color: #155724;
            display: block;
        }
        #status.error {
            background: #f8d7da;
            color: #721c24;
            display: block;
        }
    </style>
</head>
<body>
    <div class="panel">
        <h2>Project Information</h2>
        <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value" id="proj-name">${projectName || 'Loading...'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">ID:</span>
            <span class="info-value" id="proj-id">${projectId || 'N/A'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Hub ID:</span>
            <span class="info-value" id="hub-id">${hubId || 'N/A'}</span>
        </div>
        <button id="refresh-btn">Refresh Project</button>
        <div id="status"></div>
    </div>
    <script>
        const btn = document.getElementById('refresh-btn');
        const status = document.getElementById('status');
        
        btn.addEventListener('click', () => {
            status.className = '';
            status.textContent = 'Refreshing...';
            status.style.display = 'block';
            
            const action = {
                type: 'tool',
                payload: {
                    toolName: 'refreshProject',
                    params: {
                        hubId: '${hubId || ''}',
                        projectId: '${projectId || ''}'
                    }
                }
            };
            
            // Send action to parent (MCP UI client)
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(action, '*');
            } else {
                // Fallback: log action
                console.log('UI Action:', action);
                setTimeout(() => {
                    status.className = 'success';
                    status.textContent = 'Project refreshed successfully!';
                }, 500);
            }
        });
        
        // Listen for action results
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'action-result') {
                if (event.data.status === 'ok') {
                    status.className = 'success';
                    status.textContent = 'Action completed successfully!';
                } else {
                    status.className = 'error';
                    status.textContent = 'Action failed: ' + (event.data.error || 'Unknown error');
                }
            }
        });
    </script>
</body>
</html>
        `
        },
        encoding: 'text'
    });
}

/**
 * Folder Actions Panel UI Resource
 * Provides actions for folder operations
 */
function createFolderActionsPanel(folderData = {}) {
    const { folderId, folderName, hubId, projectId } = folderData;
    
    return createUIResource({
        uri: 'ui://folder/actions',
        name: 'Folder Actions',
        content: {
            type: 'rawHtml',
            htmlString: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="mcpui.dev/ui-preferred-frame-size" content="width=600,height=500">
    <title>Folder Actions</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 16px;
            background: #f5f5f5;
        }
        .panel {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h3 {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #1a1a1a;
        }
        .folder-name {
            color: #666;
            font-size: 14px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #eee;
        }
        button {
            display: block;
            width: 100%;
            margin-bottom: 8px;
            padding: 10px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            text-align: left;
        }
        button:hover {
            background: #0056b3;
        }
        button.secondary {
            background: #6c757d;
        }
        button.secondary:hover {
            background: #545b62;
        }
        #status {
            margin-top: 12px;
            padding: 8px;
            border-radius: 4px;
            display: none;
            font-size: 13px;
        }
        #status.success {
            background: #d4edda;
            color: #155724;
            display: block;
        }
        #status.error {
            background: #f8d7da;
            color: #721c24;
            display: block;
        }
        #results {
            margin-top: 16px;
            display: none;
        }
        #results.show {
            display: block;
        }
        .results-header {
            font-weight: 600;
            margin-bottom: 12px;
            color: #1a1a1a;
            font-size: 14px;
        }
        .items-list {
            max-height: 400px;
            overflow-y: auto;
        }
        .item {
            padding: 8px 12px;
            margin-bottom: 4px;
            background: #f8f9fa;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .item-icon {
            font-size: 16px;
        }
        .item-name {
            flex: 1;
            font-size: 13px;
            color: #1a1a1a;
        }
        .item-type {
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
        }
        .item-count {
            font-size: 12px;
            color: #666;
            margin-top: 8px;
        }
    </style>
</head>
<body>
    <div class="panel">
        <h3>Folder Actions</h3>
        <div class="folder-name">${folderName || 'Folder'}</div>
        <button id="new-item-btn">📄 Create New Item</button>
        <button id="refresh-btn" class="secondary">🔄 Refresh Contents</button>
        <button id="view-details-btn" class="secondary">ℹ️ View Details</button>
        <div id="status"></div>
        <div id="results">
            <div class="results-header">Folder Contents</div>
            <div class="item-count" id="item-count"></div>
            <div class="items-list" id="items-list"></div>
        </div>
    </div>
    <script>
        const status = document.getElementById('status');
        
        function sendAction(toolName, params) {
            status.className = '';
            status.textContent = 'Processing...';
            status.style.display = 'block';
            
            // Get values from template or use empty string fallback
            const hubId = '${hubId || ''}';
            const projectId = '${projectId || ''}';
            const folderId = '${folderId || ''}';
            
            console.log('Folder Actions Panel - Sending action:', {
                toolName,
                hubId,
                projectId,
                folderId,
                params
            });
            
            const action = {
                type: 'tool',
                payload: {
                    toolName: toolName,
                    params: {
                        hubId: hubId,
                        projectId: projectId,
                        folderId: folderId,
                        ...params
                    }
                }
            };
            
            console.log('Full action object:', action);
            
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(action, '*');
            } else {
                console.log('UI Action:', action);
                setTimeout(() => {
                    status.className = 'success';
                    status.textContent = 'Action sent successfully!';
                }, 500);
            }
        }
        
        document.getElementById('new-item-btn').addEventListener('click', () => {
            sendAction('createItem', {});
        });
        
        document.getElementById('refresh-btn').addEventListener('click', () => {
            sendAction('refreshFolder', {});
        });
        
        document.getElementById('view-details-btn').addEventListener('click', () => {
            sendAction('getFolderDetails', {});
        });
        
        // Render folder contents
        function renderFolderContents(data) {
            console.log('renderFolderContents called with:', data);
            
            const resultsDiv = document.getElementById('results');
            const itemsList = document.getElementById('items-list');
            const itemCount = document.getElementById('item-count');
            
            if (!resultsDiv || !itemsList || !itemCount) {
                console.error('Could not find results elements:', {
                    resultsDiv: !!resultsDiv,
                    itemsList: !!itemsList,
                    itemCount: !!itemCount
                });
                return;
            }
            
            if (!data || !data.items || data.items.length === 0) {
                console.log('No items to render');
                itemCount.textContent = 'No items found in this folder.';
                itemsList.innerHTML = '';
                resultsDiv.classList.add('show');
                return;
            }
            
            console.log('Rendering ' + data.items.length + ' items');
            itemCount.textContent = 'Found ' + (data.itemCount || data.items.length) + ' item(s)';
            itemsList.innerHTML = data.items.map(item => {
                const icon = item.type === 'folders' ? '📁' : '📄';
                const name = item.name || (item.attributes && item.attributes.displayName) || 'Unknown';
                const type = item.type === 'folders' ? 'Folder' : 'File';
                return '<div class="item">' +
                    '<span class="item-icon">' + icon + '</span>' +
                    '<span class="item-name">' + name + '</span>' +
                    '<span class="item-type">' + type + '</span>' +
                    '</div>';
            }).join('');
            
            resultsDiv.classList.add('show');
            console.log('Results div should now be visible');
        }
        
        // Listen for action results
        window.addEventListener('message', (event) => {
            console.log('Folder Actions Panel - Received message:', event.data);
            
            if (event.data && event.data.type === 'action-result') {
                console.log('Action result received:', {
                    status: event.data.status,
                    hasData: !!event.data.data,
                    dataKeys: event.data.data ? Object.keys(event.data.data) : []
                });
                
                if (event.data.status === 'ok') {
                    status.className = 'success';
                    status.textContent = 'Action completed successfully!';
                    
                    // If we have data, render it
                    if (event.data.data) {
                        console.log('Rendering folder contents:', event.data.data);
                        // Check if it's folder details data
                        if (event.data.data.items !== undefined) {
                            console.log('Found items array, rendering...');
                            renderFolderContents(event.data.data);
                        } else if (event.data.data.itemCount !== undefined) {
                            console.log('Found itemCount, rendering...');
                            // refreshFolder response
                            renderFolderContents(event.data.data);
                        } else {
                            console.warn('Data exists but no items or itemCount found:', event.data.data);
                        }
                    } else {
                        console.warn('No data in action result');
                    }
                } else {
                    status.className = 'error';
                    status.textContent = 'Action failed: ' + (event.data.error || 'Unknown error');
                    const resultsDiv = document.getElementById('results');
                    if (resultsDiv) {
                        resultsDiv.classList.remove('show');
                    }
                }
            } else {
                console.log('Message ignored - not an action-result:', event.data);
            }
        });
    </script>
</body>
</html>
        `
        },
        encoding: 'text'
    });
}

/**
 * Hub Overview Panel UI Resource
 */
function createHubOverviewPanel(hubData = {}) {
    const { hubId, hubName, projectCount } = hubData;
    
    return createUIResource({
        uri: 'ui://hub/overview',
        name: 'Hub Overview',
        content: {
            type: 'rawHtml',
            htmlString: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="mcpui.dev/ui-preferred-frame-size" content="width=500,height=200">
    <title>Hub Overview</title>
    <style>
        body { font-family: sans-serif; padding: 16px; }
        .panel { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h2 { margin-bottom: 16px; }
        .stat { padding: 8px 0; border-bottom: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="panel">
        <h2>${hubName || 'Hub'}</h2>
        <div class="stat">Projects: ${projectCount || 0}</div>
        <div class="stat">Hub ID: ${hubId || 'N/A'}</div>
    </div>
</body>
</html>
        `
        },
        encoding: 'text'
    });
}

/**
 * UI Resource Map
 * Maps resource IDs to resource creators
 */
const uiResourceMap = {
    'project/info': (data) => createProjectInfoPanel(data),
    'folder/actions': (data) => createFolderActionsPanel(data),
    'hub/overview': (data) => createHubOverviewPanel(data),
};

/**
 * Get a UI resource by ID
 * @param {string} resourceId - Resource ID (e.g., 'project/info')
 * @param {object} data - Optional data to pass to resource creator
 * @returns {object} UI Resource object
 */
function getUIResource(resourceId, data = {}) {
    const creator = uiResourceMap[resourceId];
    if (!creator) {
        throw new Error(`Unknown UI resource: ${resourceId}`);
    }
    return creator(data);
}

/**
 * List all available UI resource IDs
 */
function listUIResources() {
    return Object.keys(uiResourceMap);
}

module.exports = {
    createProjectInfoPanel,
    createFolderActionsPanel,
    createHubOverviewPanel,
    getUIResource,
    listUIResources,
    uiResourceMap
};

