import React, { useState } from 'react';
import McpUIPanel from './components/McpUIPanel.jsx';

function App() {
  const [resourceId, setResourceId] = useState('project/info');
  const [data, setData] = useState({
    projectId: '',
    hubId: '',
    projectName: '',
    folderId: '',
    folderName: '',
    hubName: '',
    projectCount: '',
  });
  const [showPanel, setShowPanel] = useState(false);

  const handleOpen = () => {
    setShowPanel(true);
  };

  const handleClose = () => {
    setShowPanel(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>MCP-UI Test App</h1>
      
      <div style={{ marginBottom: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Test Panel</h2>
        
        <div style={{ marginBottom: '10px' }}>
          <label>
            Resource ID:
            <select 
              value={resourceId} 
              onChange={(e) => setResourceId(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px' }}
            >
              <option value="project/info">Project Info</option>
              <option value="folder/actions">Folder Actions</option>
              <option value="hub/overview">Hub Overview</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            Project ID:
            <input
              type="text"
              value={data.projectId}
              onChange={(e) => setData({ ...data, projectId: e.target.value })}
              style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
              placeholder="a.YnVzaW5lc3M6c3N0dGVzdDEwMTUzI0QyMDI1MDkwNTk3NzU4ODA1MQ"
            />
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            Hub ID:
            <input
              type="text"
              value={data.hubId}
              onChange={(e) => setData({ ...data, hubId: e.target.value })}
              style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
              placeholder="a.YnVzaW5lc3M6c3N0dGVzdDEwMTUz"
            />
          </label>
        </div>

        {resourceId === 'project/info' && (
          <div style={{ marginBottom: '10px' }}>
            <label>
              Project Name:
              <input
                type="text"
                value={data.projectName}
                onChange={(e) => setData({ ...data, projectName: e.target.value })}
                style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
                placeholder="Assets"
              />
            </label>
          </div>
        )}

        {resourceId === 'folder/actions' && (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label>
                Folder ID:
                <input
                  type="text"
                  value={data.folderId}
                  onChange={(e) => setData({ ...data, folderId: e.target.value })}
                  style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
                  placeholder="Folder ID (required)"
                />
              </label>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>
                Folder Name:
                <input
                  type="text"
                  value={data.folderName}
                  onChange={(e) => setData({ ...data, folderName: e.target.value })}
                  style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
                  placeholder="My Folder"
                />
              </label>
            </div>
          </>
        )}

        {resourceId === 'hub/overview' && (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label>
                Hub Name:
                <input
                  type="text"
                  value={data.hubName}
                  onChange={(e) => setData({ ...data, hubName: e.target.value })}
                  style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
                  placeholder="Fusion TFlex Test Hub"
                />
              </label>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>
                Project Count:
                <input
                  type="number"
                  value={data.projectCount}
                  onChange={(e) => setData({ ...data, projectCount: e.target.value })}
                  style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
                  placeholder="3"
                />
              </label>
            </div>
          </>
        )}

        <button
          onClick={handleOpen}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Open MCP-UI Panel
        </button>
      </div>

      {showPanel && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '500px',
          height: '600px',
          background: 'white',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          borderRadius: '8px',
          zIndex: 1000,
        }}>
          <McpUIPanel
            resourceId={resourceId}
            data={data}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  );
}

export default App;

