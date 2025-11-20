import React, { useState, useEffect } from 'react';
import { UIResourceRenderer } from '@mcp-ui/client';

function McpUIPanel({ resourceId, data = {}, onClose, onViewerLoad }) {
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Build query string from data
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
    
    const url = `/mcp-ui/resource/${resourceId}?${params.toString()}`;
    console.log('Fetching MCP-UI resource from:', url);
    
    fetch(url, {
      credentials: 'include', // Include cookies for authentication
    })
      .then(res => {
        console.log('Response status:', res.status);
        if (!res.ok) {
          throw new Error(`Failed to load resource: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(resourceData => {
        console.log('Received resource:', resourceData);
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
        credentials: 'include', // Include cookies for authentication
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
  useEffect(() => {
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
            
            // Load the version in the React app's viewer
            if (params.versionId && params.itemId) {
              console.log('Processing viewer opening for version:', params.versionId);
              console.log('Result data:', result.data);
              
              // Use itemId (lineage URN) for viewing - this is what the Autodesk Viewer needs
              // The itemId format is: urn:adsk.wipprod:dm.lineage:xxx
              const viewerUrn = result.data?.viewerUrn || params.itemId;
              
              console.log('Loading viewer in React app with URN:', viewerUrn);
              console.log('onViewerLoad callback available:', !!onViewerLoad);
              
              // Call the onViewerLoad callback to open the viewer in the React app
              if (onViewerLoad) {
                console.log('Calling onViewerLoad with URN:', viewerUrn, 'and params:', {
                  itemId: params.itemId,
                  versionId: params.versionId,
                  projectId: params.projectId,
                  hubId: params.hubId
                });
                // Pass all parameters needed for standalone viewer
                onViewerLoad(
                  viewerUrn,
                  params.itemId,
                  params.versionId,
                  params.projectId,
                  params.hubId
                );
                console.log('✅ Viewer load requested in React app');
              } else {
                console.warn('❌ onViewerLoad callback not provided, cannot load viewer inline');
                console.warn('Falling back to opening in new window');
                // Fallback: open in new window
                const viewerUrl = result.data?.viewerUrl || `https://aps.autodesk.com/viewers/viewer.html?urn=${encodeURIComponent(viewerUrn)}`;
                window.open(viewerUrl, '_blank');
              }
            } else {
              console.error('Missing required parameters:', { versionId: params.versionId, itemId: params.itemId });
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
    return (
      <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Loading MCP UI...</h3>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
              }}
            >
              ×
            </button>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>Loading resource...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Error</h3>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
              }}
            >
              ×
            </button>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#dc3545' }}>Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!resource) {
    return null;
  }

  return (
    <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #ddd', paddingBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>{resource.name || 'MCP UI Panel'}</h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
            onMouseOver={(e) => e.target.style.background = '#f0f0f0'}
            onMouseOut={(e) => e.target.style.background = 'none'}
          >
            ×
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <UIResourceRenderer
          resource={resource}
          onUIAction={handleUIAction}
          htmlProps={{
            iframeProps: {
              style: {
                width: '100%',
                height: '100%',
                border: 'none',
              },
            },
            autoResizeIframe: { width: false, height: true },
          }}
        />
      </div>
    </div>
  );
}

export default McpUIPanel;

