import React, { useState, useEffect } from 'react';
import { UIResourceRenderer } from '@mcp-ui/client';

function McpUIPanel({ resourceId, data = {}, onClose }) {
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

