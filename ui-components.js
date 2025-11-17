/**
 * UI Components for MCP UI
 * Creates HTML components for displaying APS Hubs tree structure
 */

/**
 * Create HTML for a tree node
 */
function createTreeNodeHTML(node, level = 0) {
    const indent = level * 20;
    const hasChildren = node.children === true || (Array.isArray(node.children) && node.children.length > 0);
    const icon = getIconForType(node.type);
    const isExpanded = node.expanded || false;
    const viewerUrn = node.viewerUrn || node.metadata?.viewerUrn;
    const isFile = node.type === 'item' || node.type === 'file';
    const isViewable = viewerUrn || node.metadata?.viewable;
    
    // Build metadata attributes for the node
    const metadataAttrs = [];
    if (viewerUrn) metadataAttrs.push(`data-viewer-urn="${escapeHtml(viewerUrn)}"`);
    if (node.metadata?.hubId) metadataAttrs.push(`data-hub-id="${escapeHtml(node.metadata.hubId)}"`);
    if (node.metadata?.projectId) metadataAttrs.push(`data-project-id="${escapeHtml(node.metadata.projectId)}"`);
    if (node.metadata?.itemId) metadataAttrs.push(`data-item-id="${escapeHtml(node.metadata.itemId)}"`);
    
    let html = `
        <div class="tree-node" data-id="${node.id}" data-type="${node.type}" ${metadataAttrs.join(' ')} style="margin-left: ${indent}px; padding: 4px 0;">
            <div class="tree-node-content" style="display: flex; align-items: center; cursor: ${hasChildren || isViewable ? 'pointer' : 'default'};">
                ${hasChildren ? `<span class="tree-expander" style="width: 16px; display: inline-block; text-align: center;">${isExpanded ? '▼' : '▶'}</span>` : '<span style="width: 16px;"></span>'}
                <span class="tree-icon" style="margin-right: 6px;">${icon}</span>
                <span class="tree-label" style="flex: 1;">${escapeHtml(node.name)}</span>
                ${isViewable ? `<span class="view-icon" title="View 3D Model" style="margin-left: 8px; cursor: pointer; opacity: 0.7; font-size: 16px;">👁️</span>` : ''}
                ${isFile && node.metadata?.versionCount ? `<span style="margin-left: 8px; font-size: 11px; color: #666;" title="${node.metadata.versionCount} version(s)">v${node.metadata.versionCount}</span>` : ''}
            </div>
            ${hasChildren && isExpanded && Array.isArray(node.children) ? 
                `<div class="tree-children" style="margin-left: 20px;">${node.children.map(child => createTreeNodeHTML(child, level + 1)).join('')}</div>` : 
                ''}
        </div>
    `;
    
    return html;
}

/**
 * Get icon for node type
 */
function getIconForType(type) {
    const icons = {
        'hub': '🏢',
        'project': '📁',
        'folder': '📂',
        'item': '📄',
        'file': '📄'
    };
    return icons[type] || '📄';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Create the main tree view HTML component
 */
function createTreeViewHTML(tree, title = 'Fusion Hubs') {
    const treeHTML = Array.isArray(tree) 
        ? tree.map(node => createTreeNodeHTML(node, 0)).join('')
        : createTreeNodeHTML(tree, 0);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="mcpui.dev/ui-preferred-frame-size" content="width=800,height=600">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            padding: 16px;
            background: #f5f5f5;
            color: #333;
        }
        .tree-container {
            background: white;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .tree-header {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #1a1a1a;
        }
        .tree-node {
            user-select: none;
        }
        .tree-node-content {
            padding: 4px 8px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        .tree-node-content:hover {
            background-color: #f0f0f0;
        }
        .tree-node.selected .tree-node-content {
            background-color: #e3f2fd;
            font-weight: 500;
        }
        .tree-expander {
            color: #666;
            font-size: 10px;
        }
        .tree-icon {
            font-size: 16px;
        }
        .tree-label {
            font-size: 14px;
        }
        .view-icon {
            margin-left: 8px;
            cursor: pointer;
            opacity: 0.6;
        }
        .view-icon:hover {
            opacity: 1;
        }
        .tree-children {
            border-left: 1px solid #e0e0e0;
            margin-left: 8px;
            padding-left: 8px;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="tree-container">
        <div class="tree-header">${title}</div>
        <div class="tree-view" id="tree-view">
            ${treeHTML || '<div class="empty-state">No items found</div>'}
        </div>
    </div>
    <script>
        // Tree interaction logic
        document.addEventListener('DOMContentLoaded', function() {
            const treeView = document.getElementById('tree-view');
            
            // Handle node expansion/collapse
            treeView.addEventListener('click', function(e) {
                const expander = e.target.closest('.tree-expander');
                if (expander) {
                    const node = expander.closest('.tree-node');
                    const children = node.querySelector('.tree-children');
                    const isExpanded = expander.textContent === '▼';
                    
                    if (isExpanded) {
                        expander.textContent = '▶';
                        if (children) children.style.display = 'none';
                    } else {
                        expander.textContent = '▼';
                        if (children) children.style.display = 'block';
                    }
                }
                
                // Handle node selection
                const nodeContent = e.target.closest('.tree-node-content');
                if (nodeContent) {
                    // Remove previous selection
                    document.querySelectorAll('.tree-node.selected').forEach(n => n.classList.remove('selected'));
                    // Add selection to clicked node
                    nodeContent.closest('.tree-node').classList.add('selected');
                    
                    // Get node data
                    const node = nodeContent.closest('.tree-node');
                    const nodeId = node.dataset.id;
                    const nodeType = node.dataset.type;
                    
                    // Emit selection event (for MCP UI integration)
                    if (window.mcpUI) {
                        window.mcpUI.emit('node-selected', { id: nodeId, type: nodeType });
                    }
                }
                
                // Handle view icon click - open viewer
                const viewIcon = e.target.closest('.view-icon');
                if (viewIcon) {
                    e.stopPropagation();
                    const node = viewIcon.closest('.tree-node');
                    const viewerUrn = node.dataset.viewerUrn;
                    const nodeId = node.dataset.id;
                    
                    if (viewerUrn) {
                        // Open viewer in new window/tab
                        const viewerUrl = \`https://aps.autodesk.com/viewers/viewer.html?urn=\${encodeURIComponent(viewerUrn)}\`;
                        window.open(viewerUrl, '_blank');
                        
                        // Also emit event for MCP UI integration
                        if (window.mcpUI) {
                            window.mcpUI.emit('view-file', { 
                                id: nodeId, 
                                urn: viewerUrn,
                                hubId: node.dataset.hubId,
                                projectId: node.dataset.projectId,
                                itemId: node.dataset.itemId
                            });
                        }
                    }
                }
                
                // Handle file node click (double-click to view)
                const fileNode = e.target.closest('.tree-node[data-type="item"]');
                if (fileNode && e.detail === 2) {
                    const viewerUrn = fileNode.dataset.viewerUrn;
                    if (viewerUrn) {
                        const viewerUrl = \`https://aps.autodesk.com/viewers/viewer.html?urn=\${encodeURIComponent(viewerUrn)}\`;
                        window.open(viewerUrl, '_blank');
                    }
                }
            });
        });
    </script>
</body>
</html>
    `;
}

/**
 * Create search results view HTML
 */
function createSearchResultsHTML(results, searchTerm) {
    if (!results || results.length === 0) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Search Results</title>
    <style>
        body { font-family: sans-serif; padding: 20px; }
        .empty { text-align: center; color: #999; padding: 40px; }
    </style>
</head>
<body>
    <div class="empty">No results found for "${searchTerm}"</div>
</body>
</html>
        `;
    }
    
    const resultsHTML = results.map(result => `
        <div style="padding: 12px; border-bottom: 1px solid #eee; cursor: pointer;" 
             data-id="${result.id}" 
             data-type="${result.type}"
             onclick="if(window.mcpUI) window.mcpUI.emit('result-selected', { id: '${result.id}', type: '${result.type}', path: '${result.path}' })">
            <div style="font-weight: 500; margin-bottom: 4px;">${escapeHtml(result.name)}</div>
            <div style="font-size: 12px; color: #666;">${escapeHtml(result.path)}</div>
        </div>
    `).join('');
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Search Results</title>
    <style>
        body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
        .container { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
        .result-item:hover { background: #f0f0f0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">Search Results for "${searchTerm}" (${results.length})</div>
        ${resultsHTML}
    </div>
</body>
</html>
    `;
}

/**
 * Create enhanced hub browser component with search and grid/list view
 */
function createHubBrowserHTML(hubs, searchTerm = '') {
    const hubsHTML = hubs.map(hub => `
        <div class="hub-card" data-hub-id="${hub.id || hub.hubId}" onclick="selectHub('${hub.id || hub.hubId}')">
            <div class="hub-icon">🏢</div>
            <div class="hub-info">
                <div class="hub-name">${escapeHtml(hub.name)}</div>
                <div class="hub-id">${escapeHtml((hub.id || hub.hubId || '').substring(0, 50))}...</div>
            </div>
            <div class="hub-actions">
                <button class="btn-browse" onclick="event.stopPropagation(); browseHub('${hub.id || hub.hubId}')">Browse</button>
            </div>
        </div>
    `).join('');
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="mcpui.dev/ui-preferred-frame-size" content="width=700,height=500">
    <title>Hub Browser</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 16px;
            background: #f5f5f5;
        }
        .browser-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .browser-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .browser-title {
            font-size: 20px;
            font-weight: 600;
            color: #1a1a1a;
        }
        .search-box {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            width: 300px;
        }
        .hubs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
        }
        .hub-card {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .hub-card:hover {
            border-color: #007bff;
            box-shadow: 0 2px 8px rgba(0,123,255,0.2);
        }
        .hub-icon {
            font-size: 32px;
        }
        .hub-info {
            flex: 1;
        }
        .hub-name {
            font-weight: 500;
            margin-bottom: 4px;
            color: #1a1a1a;
        }
        .hub-id {
            font-size: 12px;
            color: #666;
            font-family: monospace;
        }
        .btn-browse {
            padding: 6px 12px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }
        .btn-browse:hover {
            background: #0056b3;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="browser-container">
        <div class="browser-header">
            <div class="browser-title">Fusion Hubs (${hubs.length})</div>
            <input type="text" class="search-box" placeholder="Search hubs..." value="${escapeHtml(searchTerm)}" oninput="filterHubs(this.value)">
        </div>
        <div class="hubs-grid" id="hubs-grid">
            ${hubsHTML || '<div class="empty-state">No hubs found</div>'}
        </div>
    </div>
    <script>
        function filterHubs(searchTerm) {
            const cards = document.querySelectorAll('.hub-card');
            cards.forEach(card => {
                const name = card.querySelector('.hub-name').textContent.toLowerCase();
                const id = card.querySelector('.hub-id').textContent.toLowerCase();
                const matches = name.includes(searchTerm.toLowerCase()) || id.includes(searchTerm.toLowerCase());
                card.style.display = matches ? 'flex' : 'none';
            });
        }
        function selectHub(hubId) {
            if (window.mcpUI) {
                window.mcpUI.emit('hub-selected', { hubId });
            }
        }
        function browseHub(hubId) {
            if (window.mcpUI) {
                window.mcpUI.emit('browse-hub', { hubId });
            }
        }
    </script>
</body>
</html>
    `;
}

/**
 * Create enhanced project tree component with expand/collapse and breadcrumbs
 */
function createProjectTreeHTML(tree, hubId, projectId = null) {
    const breadcrumbs = projectId ? 
        `<div class="breadcrumbs">🏢 Hub → 📁 Project</div>` : 
        `<div class="breadcrumbs">🏢 Hub</div>`;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="mcpui.dev/ui-preferred-frame-size" content="width=800,height=600">
    <title>Project Tree</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 16px;
            background: #f5f5f5;
        }
        .tree-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .breadcrumbs {
            font-size: 12px;
            color: #666;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #eee;
        }
        .tree-header {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #1a1a1a;
        }
        .tree-node {
            user-select: none;
            margin: 2px 0;
        }
        .tree-node-content {
            padding: 6px 8px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .tree-node-content:hover {
            background-color: #f0f0f0;
        }
        .tree-expander {
            width: 20px;
            text-align: center;
            color: #666;
            font-size: 10px;
        }
        .tree-icon {
            margin-right: 6px;
            font-size: 16px;
        }
        .tree-label {
            flex: 1;
            font-size: 14px;
        }
        .tree-children {
            margin-left: 20px;
            border-left: 2px solid #e0e0e0;
            padding-left: 8px;
            display: none;
        }
        .tree-node.expanded .tree-children {
            display: block;
        }
    </style>
</head>
<body>
    <div class="tree-container">
        ${breadcrumbs}
        <div class="tree-header">Projects & Files</div>
        <div class="tree-view" id="tree-view">
            ${Array.isArray(tree) ? tree.map(node => createEnhancedTreeNodeHTML(node, 0)).join('') : createEnhancedTreeNodeHTML(tree, 0)}
        </div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('tree-view').addEventListener('click', function(e) {
                const expander = e.target.closest('.tree-expander');
                if (expander) {
                    const node = expander.closest('.tree-node');
                    node.classList.toggle('expanded');
                    expander.textContent = node.classList.contains('expanded') ? '▼' : '▶';
                }
                
                const nodeContent = e.target.closest('.tree-node-content');
                if (nodeContent) {
                    const node = nodeContent.closest('.tree-node');
                    const nodeId = node.dataset.id;
                    const nodeType = node.dataset.type;
                    if (window.mcpUI) {
                        window.mcpUI.emit('node-selected', { id: nodeId, type: nodeType });
                    }
                }
            });
        });
    </script>
</body>
</html>
    `;
}

function createEnhancedTreeNodeHTML(node, level = 0) {
    const hasChildren = node.children === true || (Array.isArray(node.children) && node.children.length > 0);
    const icon = getIconForType(node.type);
    
    return `
        <div class="tree-node" data-id="${node.id}" data-type="${node.type}">
            <div class="tree-node-content">
                ${hasChildren ? '<span class="tree-expander">▶</span>' : '<span class="tree-expander"></span>'}
                <span class="tree-icon">${icon}</span>
                <span class="tree-label">${escapeHtml(node.name)}</span>
            </div>
            ${hasChildren && Array.isArray(node.children) ? 
                `<div class="tree-children">${node.children.map(child => createEnhancedTreeNodeHTML(child, level + 1)).join('')}</div>` : 
                ''}
        </div>
    `;
}

/**
 * Create item viewer component with versions and download options
 */
function createItemViewerHTML(item, versions = [], isFolder = false) {
    const itemType = isFolder ? 'Folder' : 'File';
    const sectionTitle = isFolder ? 'Contents' : 'Versions';
    
    const versionsHTML = versions.map((version, idx) => {
        const icon = version.type === 'folders' ? '📁' : '📄';
        const label = isFolder ? `${icon} ${version.name || 'Unknown'}` : `Version ${idx + 1}`;
        const date = version.createTime || version.id || 'N/A';
        
        return `
        <div class="version-item">
            <div class="version-info">
                <div class="version-label">${escapeHtml(label)}</div>
                <div class="version-date">${escapeHtml(date)}</div>
            </div>
            ${!isFolder ? `<button class="btn-download" onclick="downloadVersion('${version.id}')">Download</button>` : ''}
        </div>
    `;
    }).join('');
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="mcpui.dev/ui-preferred-frame-size" content="width=600,height=500">
    <title>Item Viewer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 16px;
            background: #f5f5f5;
        }
        .viewer-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .item-header {
            border-bottom: 1px solid #eee;
            padding-bottom: 16px;
            margin-bottom: 20px;
        }
        .item-name {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #1a1a1a;
        }
        .item-type-badge {
            display: inline-block;
            margin-left: 8px;
            padding: 2px 8px;
            background: #e3f2fd;
            color: #1976d2;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        .item-id {
            font-size: 12px;
            color: #666;
            font-family: monospace;
            word-break: break-all;
            margin-top: 8px;
        }
        .section-title {
            font-size: 16px;
            font-weight: 600;
            margin: 20px 0 12px 0;
            color: #1a1a1a;
        }
        .versions-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .version-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .version-label {
            font-weight: 500;
            margin-bottom: 4px;
        }
        .version-date {
            font-size: 12px;
            color: #666;
        }
        .btn-download {
            padding: 6px 12px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }
        .btn-download:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <div class="viewer-container">
        <div class="item-header">
            <div class="item-name">${escapeHtml(item.name || item.attributes?.displayName || 'Unknown Item')}<span class="item-type-badge">${itemType}</span></div>
            <div class="item-id">${escapeHtml(item.id || '')}</div>
        </div>
        <div class="section-title">${sectionTitle} (${versions.length})</div>
        <div class="versions-list">
            ${versionsHTML || '<div style="color: #999; padding: 20px; text-align: center;">No items available</div>'}
        </div>
    </div>
    <script>
        function downloadVersion(versionId) {
            if (window.mcpUI) {
                window.mcpUI.emit('download-version', { versionId });
            }
        }
    </script>
</body>
</html>
    `;
}

module.exports = {
    createTreeViewHTML,
    createSearchResultsHTML,
    createTreeNodeHTML,
    createHubBrowserHTML,
    createProjectTreeHTML,
    createItemViewerHTML
};
