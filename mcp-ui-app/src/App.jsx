import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import McpUIPanel from './components/McpUIPanel.jsx';
import Viewer from './components/Viewer.jsx';
import VersionViewer from './components/VersionViewer.jsx';

function Home() {
  const [resourceId, setResourceId] = useState('folder/actions');
  const [data, setData] = useState({
    projectId: 'a.YnVzaW5lc3M6c3N0dGVzdDEwMTUzIzIwMjUwOTA1OTc3NTg3OTUx',
    hubId: 'a.YnVzaW5lc3M6c3N0dGVzdDEwMTUz',
    projectName: '',
    folderId: 'urn:adsk.wipprod:fs.folder:co.5qLr7tsaSNCflEcSTre6nQ',
    folderName: 'My Folder',
    hubName: '',
    projectCount: '',
  });
  const [showPanel, setShowPanel] = useState(false);
  const [viewerUrn, setViewerUrn] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const navigate = useNavigate();

  const handleOpen = () => {
    setShowPanel(true);
  };

  const handleClose = () => {
    setShowPanel(false);
  };

  const handleViewerLoad = (urn, itemId, versionId, projectId, hubId) => {
    console.log('Loading viewer with URN:', urn, 'itemId:', itemId, 'versionId:', versionId);
    
    // If we have itemId and versionId, navigate to standalone viewer
    if (itemId && versionId && projectId) {
      const params = new URLSearchParams({ projectId });
      if (hubId) params.set('hubId', hubId);
      navigate(`/viewer/${encodeURIComponent(itemId)}/${encodeURIComponent(versionId)}?${params.toString()}`);
    } else {
      // Fallback to inline viewer
      setViewerUrn(urn);
      setShowViewer(true);
    }
  };

  const handleViewerClose = () => {
    setShowViewer(false);
    setViewerUrn(null);
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
            onViewerLoad={handleViewerLoad}
          />
        </div>
      )}

      {showViewer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'white',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            padding: '10px 20px',
            background: '#f5f5f5',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h3 style={{ margin: 0 }}>3D Viewer</h3>
            <button
              onClick={handleViewerClose}
              style={{
                padding: '8px 16px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Close Viewer
            </button>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <Viewer urn={viewerUrn} />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/viewer/:itemId/:versionId" element={<VersionViewer />} />
        <Route path="/viewer/:itemId/:versionId/:projectId" element={<VersionViewer />} />
        <Route path="/viewer/:itemId/:versionId/:projectId/:hubId" element={<VersionViewer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

