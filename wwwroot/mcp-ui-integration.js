/**
 * MCP-UI Integration for APS Hubs Browser
 * Integrates MCP-UI panels into the existing vanilla JS frontend
 */

/**
 * Open an MCP-UI panel
 * @param {string} resourceId - Resource ID (e.g., 'project/info')
 * @param {object} data - Data to pass to the resource (projectId, hubId, etc.)
 * @param {object} options - Options (position, size, etc.)
 */
async function openMcpUIPanel(resourceId, data = {}, options = {}) {
    if (!resourceId) {
        console.error('openMcpUIPanel: resourceId is required');
        throw new Error('Resource ID is required');
    }

    // Check for React dependencies
    if (!window.React || !window.ReactDOM) {
        console.error('React or ReactDOM not available. Make sure React is loaded before calling openMcpUIPanel.');
        throw new Error('React dependencies not available');
    }

    if (!window.McpUIPanel) {
        console.error('McpUIPanel component not available. Make sure mcp-ui-panel.js is loaded.');
        throw new Error('McpUIPanel component not available');
    }

    // Create panel container if it doesn't exist
    let panelContainer = document.getElementById('mcp-ui-panel-container');
    if (!panelContainer) {
        panelContainer = document.createElement('div');
        panelContainer.id = 'mcp-ui-panel-container';
        panelContainer.className = 'mcp-ui-container';
        document.body.appendChild(panelContainer);
    }

    // Create React root if needed
    if (!window.mcpUIRoot) {
        try {
            const React = window.React;
            const ReactDOM = window.ReactDOM;
            window.mcpUIRoot = ReactDOM.createRoot(panelContainer);
        } catch (err) {
            console.error('Failed to create React root:', err);
            throw new Error('Failed to initialize React root');
        }
    }

    // Render the panel
    try {
        const React = window.React;
        const McpUIPanel = window.McpUIPanel;
        
        window.mcpUIRoot.render(
            React.createElement(McpUIPanel, {
                resourceId: resourceId,
                data: data,
                onClose: () => {
                    try {
                        window.mcpUIRoot.render(null);
                        panelContainer.style.display = 'none';
                    } catch (err) {
                        console.error('Error closing panel:', err);
                    }
                }
            })
        );

        // Show the panel
        panelContainer.style.display = 'block';
        
        // Apply position/size options
        if (options.position === 'sidebar') {
            panelContainer.classList.add('sidebar-panel');
            panelContainer.classList.remove('modal-panel');
        } else if (options.position === 'modal') {
            panelContainer.classList.add('modal-panel');
            panelContainer.classList.remove('sidebar-panel');
        }
    } catch (err) {
        console.error('Error rendering MCP-UI panel:', err);
        throw err;
    }
}

/**
 * Close MCP-UI panel
 */
function closeMcpUIPanel() {
    try {
        const panelContainer = document.getElementById('mcp-ui-panel-container');
        if (panelContainer) {
            if (window.mcpUIRoot) {
                try {
                    window.mcpUIRoot.render(null);
                } catch (err) {
                    console.warn('Error clearing React root:', err);
                }
            }
            panelContainer.style.display = 'none';
        }
    } catch (err) {
        console.error('Error closing MCP-UI panel:', err);
    }
}

/**
 * Add MCP-UI button to tree nodes
 * This adds a button to project/folder nodes to open MCP-UI panels
 */
function enhanceTreeWithMcpUI() {
    console.log('Enhancing tree with MCP-UI buttons...');
    
    // Function to process all tree nodes
    const processTreeNodes = () => {
        try {
            // Try multiple selectors - InspireTree might use different classes
            const selectors = [
                '.inspire-tree-node',
                '[data-id]',
                '.inspire-tree-node[data-id*="project"]',
                '.inspire-tree-node[data-id*="folder"]'
            ];
            
            let allNodes = new Set();
            selectors.forEach(selector => {
                const nodes = document.querySelectorAll(selector);
                nodes.forEach(node => allNodes.add(node));
            });
            
            const treeNodes = Array.from(allNodes);
            console.log(`Found ${treeNodes.length} tree nodes to process`);
            
            // Debug: log first few nodes
            if (treeNodes.length > 0) {
                console.log('Sample tree node structure:', {
                    firstNode: treeNodes[0],
                    className: treeNodes[0].className,
                    attributes: Array.from(treeNodes[0].attributes).map(a => `${a.name}="${a.value}"`),
                    innerHTML: treeNodes[0].innerHTML.substring(0, 200),
                    dataId: treeNodes[0].getAttribute('data-id'),
                    children: Array.from(treeNodes[0].children).map(c => ({
                        tag: c.tagName,
                        className: c.className,
                        dataId: c.getAttribute('data-id')
                    }))
                });
            }
            
            treeNodes.forEach((node, index) => {
                try {
                    addMcpUIButton(node);
                } catch (err) {
                    console.warn(`Error adding button to node ${index}:`, err);
                }
            });
        } catch (err) {
            console.warn('Error processing tree nodes:', err);
        }
    };
    
    // Wait for tree to be initialized, then check multiple times
    setTimeout(() => {
        try {
            const treeElement = document.querySelector('#tree');
            if (!treeElement) {
                console.warn('Tree element not found, cannot enhance with MCP-UI');
                return;
            }

            // Process existing nodes immediately
            processTreeNodes();

            // Use MutationObserver to detect new tree nodes
            const observer = new MutationObserver((mutations) => {
                let shouldProcess = false;
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Check if it's a tree node or contains tree nodes
                            if (node.classList && node.classList.contains('inspire-tree-node')) {
                                shouldProcess = true;
                            } else if (node.querySelector && node.querySelector('.inspire-tree-node')) {
                                shouldProcess = true;
                            }
                        }
                    });
                });
                
                if (shouldProcess) {
                    // Debounce: wait a bit for DOM to settle
                    setTimeout(() => {
                        processTreeNodes();
                    }, 100);
                }
            });

            observer.observe(treeElement, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            });

            // Also process nodes after a delay (in case they're added asynchronously)
            setTimeout(processTreeNodes, 2000);
            setTimeout(processTreeNodes, 5000);
            
            console.log('MCP-UI tree enhancement initialized');
        } catch (err) {
            console.error('Error enhancing tree with MCP-UI:', err);
        }
    }, 1000);
}

/**
 * Add MCP-UI button to a tree node
 */
function addMcpUIButton(treeNode) {
    // Check if button already exists
    if (treeNode.querySelector('.mcp-ui-btn')) return;

    // Try multiple ways to get the node ID - be very thorough
    let nodeId = null;
    
    // Method 1: Direct attributes on the node
    nodeId = treeNode.getAttribute('data-id') || 
             treeNode.getAttribute('data-tree-id') ||
             treeNode.getAttribute('id');
    
    // Method 2: Find data-id in child elements (InspireTree might nest it)
    if (!nodeId) {
        const dataIdElements = treeNode.querySelectorAll('[data-id]');
        for (let elem of dataIdElements) {
            const id = elem.getAttribute('data-id');
            if (id && (id.includes('project|') || id.includes('folder|'))) {
                nodeId = id;
                break;
            }
        }
    }
    
    // Method 3: Try to get from InspireTree's internal structure
    if (!nodeId) {
        try {
            const treeElement = document.querySelector('#tree');
            if (treeElement) {
                // Try accessing InspireTreeDOM
                if (treeElement._treeDom && treeElement._treeDom.tree) {
                    const allNodes = treeElement._treeDom.tree.nodes();
                    for (let node of allNodes) {
                        try {
                            // Get the rendered node
                            const rendered = node.rendered();
                            if (rendered && (rendered === treeNode || rendered.contains(treeNode) || treeNode.contains(rendered))) {
                                nodeId = node.id;
                                console.log('Found node ID from InspireTree:', nodeId);
                                break;
                            }
                        } catch (e) {
                            // Continue searching
                        }
                    }
                }
                
                // Alternative: search by text content
                if (!nodeId) {
                    const nodeText = treeNode.textContent.trim();
                    if (nodeText) {
                        const allNodes = treeElement._treeDom?.tree?.nodes() || [];
                        for (let node of allNodes) {
                            if (node.text === nodeText && (node.id.includes('project|') || node.id.includes('folder|'))) {
                                nodeId = node.id;
                                console.log('Found node ID by text match:', nodeId);
                                break;
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.debug('Could not get node ID from InspireTree:', err);
        }
    }
    
    // Method 4: Search parent elements
    if (!nodeId) {
        let parent = treeNode.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
            const id = parent.getAttribute('data-id');
            if (id && (id.includes('project|') || id.includes('folder|'))) {
                nodeId = id;
                break;
            }
            parent = parent.parentElement;
            depth++;
        }
    }
    
    if (!nodeId) {
        // Debug: log the tree node structure
        console.debug('Could not find nodeId for tree node:', {
            element: treeNode,
            className: treeNode.className,
            attributes: Array.from(treeNode.attributes).map(attr => `${attr.name}="${attr.value}"`),
            innerHTML: treeNode.innerHTML.substring(0, 100)
        });
        return;
    }

    const tokens = nodeId.split('|');
    const nodeType = tokens[0];

    // Only add buttons to projects and folders
    if (nodeType !== 'project' && nodeType !== 'folder') {
        console.debug('Skipping node type:', nodeType, 'nodeId:', nodeId);
        return;
    }
    
    console.log('Adding MCP-UI button to', nodeType, 'node:', nodeId);
    
    // Validate token count
    if (nodeType === 'folder' && tokens.length < 4) {
        console.error('Invalid folder nodeId format. Expected "folder|hubId|projectId|folderId", got:', nodeId, 'tokens:', tokens);
        return;
    }

    const button = document.createElement('button');
    button.className = 'mcp-ui-btn';
    button.title = 'Open MCP UI Panel';
    button.innerHTML = '🎨';
    button.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        try {
            console.log('MCP-UI Button clicked:', {
                nodeId,
                tokens,
                nodeType,
                treeNodeText: treeNode.textContent.trim()
            });
            
            if (!window.openMcpUIPanel) {
                console.error('openMcpUIPanel function not available');
                alert('MCP-UI panel function not available. Please refresh the page.');
                return;
            }
            
            if (nodeType === 'project') {
                if (tokens.length < 3) {
                    console.error('Invalid project node ID format. Expected at least 3 tokens, got:', tokens.length);
                    alert('Invalid project data. Please try again.');
                    return;
                }
                openMcpUIPanel('project/info', {
                    projectId: tokens[2],
                    hubId: tokens[1],
                    projectName: treeNode.textContent.trim().replace('🎨', '').trim()
                }, { position: 'sidebar' }).catch(err => {
                    console.error('Error opening project panel:', err);
                    alert('Could not open project panel. See console for details.');
                });
            } else if (nodeType === 'folder') {
                if (tokens.length < 4) {
                    console.error('Invalid folder node ID format. Expected 4 tokens, got:', tokens.length);
                    alert('Invalid folder data. Please try again.');
                    return;
                }
                
                const folderData = {
                    folderId: tokens[3],
                    projectId: tokens[2],
                    hubId: tokens[1],
                    folderName: treeNode.textContent.trim().replace('🎨', '').trim()
                };
                
                console.log('Opening folder actions panel with data:', folderData);
                
                if (!folderData.folderId) {
                    console.error('WARNING: folderId is empty!', {
                        nodeId,
                        tokens,
                        tokenCount: tokens.length
                    });
                    alert('Invalid folder data. Please try again.');
                    return;
                }
                
                openMcpUIPanel('folder/actions', folderData, { position: 'sidebar' }).catch(err => {
                    console.error('Error opening folder panel:', err);
                    alert('Could not open folder panel. See console for details.');
                });
            }
        } catch (err) {
            console.error('Error in MCP-UI button click handler:', err);
            alert('An error occurred. See console for details.');
        }
    };

    // Find the node text element and append button
    try {
        // Try multiple selectors to find the text element
        const nodeText = treeNode.querySelector('.inspire-tree-node-text') || 
                         treeNode.querySelector('.title') ||
                         treeNode.querySelector('[class*="title"]') ||
                         treeNode.querySelector('[class*="text"]') ||
                         treeNode.querySelector('span') ||
                         treeNode.firstElementChild;
        
        if (nodeText) {
            // Make sure the parent container can hold the button
            const container = nodeText.parentElement || treeNode;
            container.style.position = 'relative';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.gap = '8px';
            container.style.width = '100%';
            
            // Style the text element
            nodeText.style.flex = '1';
            nodeText.style.minWidth = '0'; // Allow text to shrink
            
            // Add button
            button.style.marginLeft = 'auto';
            button.style.flexShrink = '0';
            container.appendChild(button);
            
            console.log('Successfully added MCP-UI button to', nodeType, 'node');
        } else {
            console.warn('Could not find node text element for button insertion:', {
                treeNode,
                className: treeNode.className,
                children: Array.from(treeNode.children).map(c => c.className)
            });
            // Fallback: append directly to tree node
            treeNode.style.position = 'relative';
            treeNode.style.display = 'flex';
            treeNode.style.alignItems = 'center';
            treeNode.style.gap = '8px';
            button.style.marginLeft = 'auto';
            treeNode.appendChild(button);
        }
    } catch (err) {
        console.error('Error appending button to tree node:', err);
    }
}

// Manual test function - can be called from browser console
window.testMcpUIButtons = function() {
    console.log('=== MCP-UI Button Test ===');
    
    // Find all possible tree nodes
    const allSelectors = [
        '.inspire-tree-node',
        '[data-id*="project"]',
        '[data-id*="folder"]',
        '[data-id]'
    ];
    
    allSelectors.forEach(selector => {
        const nodes = document.querySelectorAll(selector);
        console.log(`Selector "${selector}": Found ${nodes.length} nodes`);
        
        if (nodes.length > 0) {
            const firstNode = nodes[0];
            console.log(`  First node:`, {
                tag: firstNode.tagName,
                className: firstNode.className,
                dataId: firstNode.getAttribute('data-id'),
                innerHTML: firstNode.innerHTML.substring(0, 150),
                children: Array.from(firstNode.children).map(c => ({
                    tag: c.tagName,
                    className: c.className,
                    dataId: c.getAttribute('data-id')
                }))
            });
        }
    });
    
    // Try to find project nodes specifically
    const projectNodes = document.querySelectorAll('[data-id*="project"]');
    console.log(`\nFound ${projectNodes.length} project nodes`);
    projectNodes.forEach((node, i) => {
        if (i < 3) { // Show first 3
            console.log(`  Project ${i + 1}:`, {
                dataId: node.getAttribute('data-id'),
                text: node.textContent.trim(),
                hasButton: !!node.querySelector('.mcp-ui-btn')
            });
        }
    });
    
    // Try to manually add a button to first project
    if (projectNodes.length > 0) {
        const firstProject = projectNodes[0];
        const nodeId = firstProject.getAttribute('data-id');
        console.log(`\nAttempting to add button to first project: ${nodeId}`);
        addMcpUIButton(firstProject);
        console.log(`Button added: ${!!firstProject.querySelector('.mcp-ui-btn')}`);
    }
    
    console.log('=== End Test ===');
};

// Export functions
window.openMcpUIPanel = openMcpUIPanel;
window.closeMcpUIPanel = closeMcpUIPanel;
window.enhanceTreeWithMcpUI = enhanceTreeWithMcpUI;

