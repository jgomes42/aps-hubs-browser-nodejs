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
            // Only handle messages that look like UI actions
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
