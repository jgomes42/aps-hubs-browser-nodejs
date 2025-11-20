/**
 * MCP-UI Panel Component
 * Renders MCP UI resources in the APS Hubs Browser frontend
 * Using React.createElement (no JSX transform needed)
 */

/**
 * MCP UI Panel Component
 * Fetches and renders MCP UI resources
 */
function McpUIPanel({ resourceId, data = {}, onClose }) {
    const [resource, setResource] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        // Build query string from data
        const params = new URLSearchParams(data);
        const url = `/mcp-ui/resource/${resourceId}?${params.toString()}`;
        
        console.log('Fetching MCP-UI resource from:', url);
        console.log('Resource data:', data);
        
        fetch(url, {
            credentials: 'include'
        })
            .then(res => {
                console.log('Resource fetch response status:', res.status);
                if (!res.ok) {
                    return res.text().then(text => {
                        console.error('Resource fetch failed:', text);
                        throw new Error(`Failed to load resource: ${res.statusText} - ${text}`);
                    });
                }
                return res.json();
            })
            .then(resourceData => {
                console.log('Resource data received:', resourceData);
                setResource(resourceData);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching resource:', err);
                setError(err.message);
                setLoading(false);
            });
    }, [resourceId, JSON.stringify(data)]);

    const handleUIAction = async (action) => {
        console.log('MCP UI Action:', action);
        
        try {
            const response = await fetch('/mcp-ui/action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(action),
            });
            
            const result = await response.json();
            console.log('Action result:', result);
            
            // Return result for UIResourceRenderer
            return result;
        } catch (err) {
            console.error('Error handling action:', err);
            return {
                status: 'error',
                error: err.message
            };
        }
    };

    // Listen for postMessage from iframe and handle actions
    React.useEffect(() => {
        const handleMessage = async (event) => {
            // Handle tool actions
            if (event.data && event.data.type === 'tool' && event.data.payload) {
                console.log('Received postMessage action from iframe:', event.data);
                
                try {
                    const response = await fetch('/mcp-ui/action', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify(event.data),
                    });
                    
                    const result = await response.json();
                    console.log('Action result:', result);
                    
                    // Send result back to iframe using event.source directly
                    if (event.source && event.source.postMessage) {
                        event.source.postMessage({
                            type: 'action-result',
                            ...result
                        }, '*');
                    }
                } catch (err) {
                    console.error('Error handling postMessage action:', err);
                    // Send error back to iframe
                    if (event.source && event.source.postMessage) {
                        event.source.postMessage({
                            type: 'action-result',
                            status: 'error',
                            error: err.message
                        }, '*');
                    }
                }
            }
            // Handle intent actions
            else if (event.data && event.data.type === 'intent' && event.data.payload) {
                console.log('Received postMessage intent from iframe:', event.data);
                
                const { intent, params } = event.data.payload;
                
                try {
                    // Handle view_version intent - load version in viewer
                    if (intent === 'view_version') {
                        console.log('Handling view_version intent:', params);
                        
                        // First, send intent to backend to get viewer URN
                        const response = await fetch('/mcp-ui/action', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            credentials: 'include',
                            body: JSON.stringify(event.data),
                        });
                        
                        const result = await response.json();
                        console.log('Intent result:', result);
                        
                        // Try to load the version in the viewer
                        if (params.versionId) {
                            console.log('Processing viewer opening for version:', params.versionId);
                            console.log('Result data:', result.data);
                            
                            // Use viewerUrl from response if available, otherwise construct it
                            let viewerUrl = result.data?.viewerUrl;
                            
                            if (!viewerUrl) {
                                // Construct viewer URL - need to base64 encode the URN
                                // Remove query parameters from versionId for URN encoding
                                let urn = params.versionId;
                                if (urn.includes('?')) {
                                    urn = urn.split('?')[0];
                                }
                                
                                // Base64 encode the URN (URL-safe base64)
                                try {
                                    const base64Urn = btoa(urn)
                                        .replace(/\+/g, '-')
                                        .replace(/\//g, '_')
                                        .replace(/=/g, '');
                                    viewerUrl = `https://aps.autodesk.com/viewers/viewer.html?urn=${base64Urn}`;
                                } catch (encodeErr) {
                                    console.error('Error encoding URN:', encodeErr);
                                    // Fallback: use versionId as-is
                                    viewerUrl = `https://aps.autodesk.com/viewers/viewer.html?urn=${encodeURIComponent(params.versionId)}`;
                                }
                            }
                            
                            console.log('Opening viewer for version:', params.versionName || params.versionId);
                            
                            // Extract the base URN from versionId (remove query parameters)
                            let baseUrn = params.versionId;
                            if (baseUrn.includes('?')) {
                                baseUrn = baseUrn.split('?')[0];
                            }
                            
                            // Always try to send message to main window to load in viewer (preferred method)
                            // The main window has a listener for 'load-viewer-version' messages
                            if (window.parent && window.parent !== window) {
                                // Send message to parent (main window) to load in viewer
                                const message = {
                                    type: 'load-viewer-version',
                                    versionId: params.versionId,
                                    itemId: params.itemId,
                                    hubId: params.hubId,
                                    projectId: params.projectId,
                                    versionName: params.versionName,
                                    viewerUrn: result.data?.viewerUrn || baseUrn, // Use base URN without query params
                                    viewerUrl: viewerUrl
                                };
                                window.parent.postMessage(message, '*');
                                console.log('Sent load-viewer-version message to main window to load inline:', message);
                            } else {
                                // Not in iframe - we're probably standalone
                                // Try to open in new window as fallback
                                console.log('Not in iframe context, opening viewer in new window');
                                try {
                                    const viewerWindow = window.open(viewerUrl, '_blank');
                                    if (!viewerWindow) {
                                        console.warn('Popup blocked. Please allow pop-ups for this site.');
                                        alert('Popup blocked. Please allow pop-ups to open the viewer.');
                                    } else {
                                        console.log('Opened viewer in new window (fallback)');
                                    }
                                } catch (viewerErr) {
                                    console.error('Error opening viewer:', viewerErr);
                                    alert('Error opening viewer: ' + viewerErr.message);
                                }
                            }
                        } else {
                            console.error('No versionId provided in params:', params);
                        }
                        
                        // Send result back to iframe
                        if (event.source && event.source.postMessage) {
                            event.source.postMessage({
                                type: 'action-result',
                                status: 'ok',
                                message: `Loading version: ${params.versionName || params.versionId}`,
                                data: result.data
                            }, '*');
                        }
                    } else {
                        // Handle other intents by sending to backend
                        const response = await fetch('/mcp-ui/action', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            credentials: 'include',
                            body: JSON.stringify(event.data),
                        });
                        
                        const result = await response.json();
                        console.log('Intent result:', result);
                        
                        // Send result back to iframe
                        if (event.source && event.source.postMessage) {
                            event.source.postMessage({
                                type: 'action-result',
                                ...result
                            }, '*');
                        }
                    }
                } catch (err) {
                    console.error('Error handling postMessage intent:', err);
                    // Send error back to iframe
                    if (event.source && event.source.postMessage) {
                        event.source.postMessage({
                            type: 'action-result',
                            status: 'error',
                            error: err.message
                        }, '*');
                    }
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    if (loading) {
        return React.createElement('div', { className: 'mcp-ui-panel' },
            React.createElement('div', { className: 'mcp-ui-header' },
                React.createElement('h3', null, 'Loading MCP UI...'),
                onClose && React.createElement('button', {
                    onClick: onClose,
                    className: 'close-btn'
                }, '×')
            ),
            React.createElement('div', { className: 'mcp-ui-content' },
                React.createElement('div', { className: 'loading' }, 'Loading resource...')
            )
        );
    }

    if (error) {
        return React.createElement('div', { className: 'mcp-ui-panel' },
            React.createElement('div', { className: 'mcp-ui-header' },
                React.createElement('h3', null, 'Error'),
                onClose && React.createElement('button', {
                    onClick: onClose,
                    className: 'close-btn'
                }, '×')
            ),
            React.createElement('div', { className: 'mcp-ui-content' },
                React.createElement('div', { className: 'error' }, `Error: ${error}`)
            )
        );
    }

    if (!resource) {
        return null;
    }

    // Debug logging
    console.log('Rendering resource:', resource);
    
    // Check if MCPUI is available BEFORE accessing it - check each part separately to avoid ReferenceError
    let mcpUIAvailable = false;
    try {
        if (typeof window !== 'undefined' && window.MCPUI) {
            if (window.MCPUI.UIResourceRenderer) {
                mcpUIAvailable = true;
            }
        }
    } catch (e) {
        console.warn('Error checking for MCPUI:', e);
        mcpUIAvailable = false;
    }
    
    console.log('MCPUI available:', mcpUIAvailable);

    // The resource should already be the correct format from the API
    // (createUIResource returns { type: 'resource', resource: {...} } but API returns just the resource)
    const resourceObj = resource.resource || resource;

    // Check if MCPUI client is available - use fallback if not
    if (!mcpUIAvailable) {
        console.warn('MCPUI client library not available. Falling back to direct HTML rendering.');
        console.log('Resource object structure:', {
            hasContent: !!resourceObj.content,
            hasText: !!resourceObj.text,
            mimeType: resourceObj.mimeType,
            uri: resourceObj.uri,
            resourceObj: resourceObj
        });
        
        // Extract HTML content - check multiple possible formats
        let htmlContent = null;
        
        // Format 1: content.htmlString (from createUIResource)
        if (resourceObj.content && resourceObj.content.type === 'rawHtml' && resourceObj.content.htmlString) {
            htmlContent = resourceObj.content.htmlString;
        }
        // Format 2: text property (from API response)
        else if (resourceObj.text) {
            htmlContent = resourceObj.text;
        }
        // Format 3: content.text
        else if (resourceObj.content && resourceObj.content.text) {
            htmlContent = resourceObj.content.text;
        }
        
        if (htmlContent) {
            console.log('Using iframe fallback rendering with HTML content');
            return React.createElement('div', { className: 'mcp-ui-panel' },
                React.createElement('div', { className: 'mcp-ui-header' },
                    React.createElement('h3', null, resourceObj.name || resource.name || 'MCP UI Panel'),
                    onClose && React.createElement('button', {
                        onClick: onClose,
                        className: 'close-btn'
                    }, '×')
                ),
                React.createElement('div', { 
                    className: 'mcp-ui-content',
                    style: { height: '100%', overflow: 'auto', padding: 0 }
                },
                    React.createElement('iframe', {
                        srcDoc: htmlContent,
                        style: {
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            minHeight: '500px',
                            display: 'block'
                        },
                        sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups',
                        onLoad: () => {
                            console.log('Iframe loaded successfully');
                        },
                        onError: (e) => {
                            console.error('Iframe load error:', e);
                        }
                    })
                )
            );
        } else {
            console.error('Resource does not have HTML content. Resource structure:', resourceObj);
            return React.createElement('div', { className: 'mcp-ui-panel' },
                React.createElement('div', { className: 'mcp-ui-header' },
                    React.createElement('h3', null, 'Error'),
                    onClose && React.createElement('button', {
                        onClick: onClose,
                        className: 'close-btn'
                    }, '×')
                ),
                React.createElement('div', { className: 'mcp-ui-content' },
                    React.createElement('div', { className: 'error' }, 
                        React.createElement('div', null, 'MCPUI client library not loaded and resource format not recognized.'),
                        React.createElement('div', { style: { marginTop: '10px', fontSize: '12px', whiteSpace: 'pre-wrap' } }, 
                            'Resource format: ' + JSON.stringify(resourceObj, null, 2).substring(0, 500) + '...'
                        )
                    )
                )
            );
        }
    }

    // Use MCPUI client library if available
    // Double-check MCPUI is available before using it
    if (mcpUIAvailable && window.MCPUI && window.MCPUI.UIResourceRenderer) {
        return React.createElement('div', { className: 'mcp-ui-panel' },
            React.createElement('div', { className: 'mcp-ui-header' },
                React.createElement('h3', null, resourceObj.name || resource.name || 'MCP UI Panel'),
                onClose && React.createElement('button', {
                    onClick: onClose,
                    className: 'close-btn'
                }, '×')
            ),
            React.createElement('div', { className: 'mcp-ui-content' },
                React.createElement(window.MCPUI.UIResourceRenderer, {
                    resource: resourceObj,
                    onUIAction: handleUIAction,
                    htmlProps: {
                        iframeProps: {
                            style: { 
                                width: '100%', 
                                height: '100%',
                                border: 'none',
                                minHeight: '400px'
                            },
                        },
                        autoResizeIframe: { width: false, height: true }
                    }
                })
            )
        );
    }
    
    // Final fallback - should not reach here, but just in case
    return React.createElement('div', { className: 'mcp-ui-panel' },
        React.createElement('div', { className: 'mcp-ui-header' },
            React.createElement('h3', null, 'Error'),
            onClose && React.createElement('button', {
                onClick: onClose,
                className: 'close-btn'
            }, '×')
        ),
        React.createElement('div', { className: 'mcp-ui-content' },
            React.createElement('div', { className: 'error' }, 
                'Unable to render MCP UI resource. Please check the console for details.'
            )
        )
    );
}

// Export for use in other components
window.McpUIPanel = McpUIPanel;
