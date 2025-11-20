import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Viewer from './Viewer.jsx';

/**
 * Standalone Version Viewer Component
 * Displays a specific version of an item with navigation between versions
 */
function VersionViewer() {
  const { itemId, versionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [itemName, setItemName] = useState('');
  const fetchingRef = useRef(false);
  const navigatingRef = useRef(false);

  // Extract query params using useMemo to avoid recreating on every render
  const { projectId, hubId } = useMemo(() => {
    const urlParams = new URLSearchParams(location.search);
    return {
      projectId: urlParams.get('projectId'),
      hubId: urlParams.get('hubId')
    };
  }, [location.search]);

  // Fetch versions for the item
  useEffect(() => {
    if (!itemId || !projectId) {
      setError('Missing required parameters: itemId and projectId are required');
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchingRef.current) {
      console.log('⏸️ Skipping fetch - already in progress');
      return;
    }

    // Prevent fetch if we're currently navigating (to avoid loops)
    if (navigatingRef.current) {
      console.log('⏸️ Skipping fetch - navigation in progress');
      return;
    }

    let cancelled = false;

    fetchingRef.current = true;

    async function fetchVersions() {
      try {
        setLoading(true);
        setError(null);

        if (!projectId) {
          throw new Error('Project ID is required');
        }

        console.log('📡 Fetching versions for item:', { itemId, projectId });

        // Fetch versions from backend
        const mainAppUrl = window.location.origin.replace(':3000', ':8080') || 'http://localhost:8080';
        const response = await fetch(
          `${mainAppUrl}/mcp-ui/api/item/${encodeURIComponent(projectId)}/${encodeURIComponent(itemId)}/versions`,
          {
            credentials: 'include',
          }
        );

        if (cancelled) return;

        if (!response.ok) {
          throw new Error(`Failed to fetch versions: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (cancelled) return;
        
        if (data.status === 'error') {
          throw new Error(data.error || 'Failed to fetch versions');
        }

        const versionsList = data.versions || [];
        setVersions(versionsList);
        setItemName(data.itemName || 'Unknown Item');

        console.log('✅ Fetched versions:', versionsList.length);

        // Normalize versionId for matching (decode URL encoding and strip query params)
        const normalizeVersionId = (id) => {
          if (!id) return null;
          // Decode URL encoding
          let normalized = decodeURIComponent(id);
          // Strip query parameters (everything after ?)
          const queryIndex = normalized.indexOf('?');
          if (queryIndex >= 0) {
            normalized = normalized.substring(0, queryIndex);
          }
          return normalized;
        };

        // Find current version
        if (versionId) {
          const normalizedVersionId = normalizeVersionId(versionId);
          // Try exact match first
          let index = versionsList.findIndex(v => v.id === versionId || v.id === normalizedVersionId);
          
          // If not found, try matching without query params
          if (index < 0) {
            index = versionsList.findIndex(v => {
              const vNormalized = normalizeVersionId(v.id);
              return vNormalized === normalizedVersionId || v.id === normalizedVersionId;
            });
          }
          
          if (index >= 0) {
            setCurrentVersionIndex(index);
            setCurrentVersion(versionsList[index]);
          } else {
            // Version not found, use first version
            console.warn('⚠️ Version not found in list, using first version:', normalizedVersionId);
            if (versionsList.length > 0 && !cancelled) {
              setCurrentVersionIndex(0);
              setCurrentVersion(versionsList[0]);
              // Only navigate if the current URL doesn't already match
              const expectedUrl = `/viewer/${encodeURIComponent(itemId)}/${encodeURIComponent(versionsList[0].id)}?projectId=${encodeURIComponent(projectId)}${hubId ? `&hubId=${encodeURIComponent(hubId)}` : ''}`;
              const currentUrl = location.pathname + location.search;
              if (currentUrl !== expectedUrl && !navigatingRef.current) {
                console.log('🔄 Navigating to first version:', expectedUrl);
                navigatingRef.current = true;
                navigate(expectedUrl, { replace: true });
                // Reset navigation flag after a short delay
                setTimeout(() => {
                  navigatingRef.current = false;
                }, 100);
              }
            }
          }
        } else {
          // No version specified, use first version
          if (versionsList.length > 0 && !cancelled) {
            setCurrentVersionIndex(0);
            setCurrentVersion(versionsList[0]);
            // Only navigate if the current URL doesn't already match
            const expectedUrl = `/viewer/${encodeURIComponent(itemId)}/${encodeURIComponent(versionsList[0].id)}?projectId=${encodeURIComponent(projectId)}${hubId ? `&hubId=${encodeURIComponent(hubId)}` : ''}`;
            const currentUrl = location.pathname + location.search;
            if (currentUrl !== expectedUrl && !navigatingRef.current) {
              console.log('🔄 Navigating to first version (no versionId):', expectedUrl);
              navigatingRef.current = true;
              navigate(expectedUrl, { replace: true });
              // Reset navigation flag after a short delay
              setTimeout(() => {
                navigatingRef.current = false;
              }, 100);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('❌ Error fetching versions:', err);
          setError(err.message || 'Failed to load versions');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          fetchingRef.current = false;
        }
      }
    }

    fetchVersions();

    return () => {
      cancelled = true;
      fetchingRef.current = false;
    };
  }, [itemId, versionId, projectId]); // Only depend on actual data values, not location or navigate

  const handlePreviousVersion = () => {
    if (currentVersionIndex > 0) {
      const prevIndex = currentVersionIndex - 1;
      const prevVersion = versions[prevIndex];
      const urlParams = new URLSearchParams(location.search);
      const projectId = urlParams.get('projectId');
      const hubId = urlParams.get('hubId');
      navigate(`/viewer/${encodeURIComponent(itemId)}/${encodeURIComponent(prevVersion.id)}?projectId=${encodeURIComponent(projectId)}${hubId ? `&hubId=${encodeURIComponent(hubId)}` : ''}`);
    }
  };

  const handleNextVersion = () => {
    if (currentVersionIndex < versions.length - 1) {
      const nextIndex = currentVersionIndex + 1;
      const nextVersion = versions[nextIndex];
      const urlParams = new URLSearchParams(location.search);
      const projectId = urlParams.get('projectId');
      const hubId = urlParams.get('hubId');
      navigate(`/viewer/${encodeURIComponent(itemId)}/${encodeURIComponent(nextVersion.id)}?projectId=${encodeURIComponent(projectId)}${hubId ? `&hubId=${encodeURIComponent(hubId)}` : ''}`);
    }
  };

  const handleVersionSelect = (selectedVersion) => {
    const index = versions.findIndex(v => v.id === selectedVersion.id);
    if (index >= 0) {
      const urlParams = new URLSearchParams(location.search);
      const projectId = urlParams.get('projectId');
      const hubId = urlParams.get('hubId');
      navigate(`/viewer/${encodeURIComponent(itemId)}/${encodeURIComponent(selectedVersion.id)}?projectId=${encodeURIComponent(projectId)}${hubId ? `&hubId=${encodeURIComponent(hubId)}` : ''}`);
    }
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr || dateTimeStr === 'N/A') return 'N/A';
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleString();
    } catch (e) {
      return dateTimeStr;
    }
  };

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading versions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px'
      }}>
        <div style={{ fontSize: '18px', color: '#dc3545', textAlign: 'center' }}>Error: {error}</div>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Go Back Home
        </button>
      </div>
    );
  }

  if (!currentVersion) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>No versions available</div>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Go Back Home
        </button>
      </div>
    );
  }

  // Use the full version file URN (INCLUDING the ?version=N query parameter)
  // The main app successfully loads using: urn:adsk.wipprod:fs.file:vf.xxx?version=3
  // This is what has derivatives, not the lineage URN!
  const viewerUrn = currentVersion?.id || itemId;

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f5f5f5'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        background: 'white',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>
            {itemName}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Version {currentVersionIndex + 1} of {versions.length}
            {currentVersion.name && ` - ${currentVersion.name}`}
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginLeft: '12px'
          }}
        >
          Close
        </button>
      </div>

      {/* Version Navigation Bar */}
      <div style={{
        padding: '8px 20px',
        background: 'white',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        overflowX: 'auto'
      }}>
        <button
          onClick={handlePreviousVersion}
          disabled={currentVersionIndex === 0}
          style={{
            padding: '6px 12px',
            background: currentVersionIndex === 0 ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: currentVersionIndex === 0 ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            whiteSpace: 'nowrap'
          }}
        >
          ← Previous
        </button>

        <div style={{
          display: 'flex',
          gap: '4px',
          overflowX: 'auto',
          flex: 1,
          padding: '4px 0'
        }}>
          {versions.map((version, index) => (
            <button
              key={version.id}
              onClick={() => handleVersionSelect(version)}
              style={{
                padding: '6px 12px',
                background: index === currentVersionIndex ? '#007bff' : '#f0f0f0',
                color: index === currentVersionIndex ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                minWidth: '60px'
              }}
              title={`Version ${index + 1}: ${version.name || version.id}\n${formatDateTime(version.createTime)}`}
            >
              V{index + 1}
            </button>
          ))}
        </div>

        <button
          onClick={handleNextVersion}
          disabled={currentVersionIndex === versions.length - 1}
          style={{
            padding: '6px 12px',
            background: currentVersionIndex === versions.length - 1 ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: currentVersionIndex === versions.length - 1 ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            whiteSpace: 'nowrap'
          }}
        >
          Next →
        </button>

        <div style={{
          fontSize: '12px',
          color: '#666',
          marginLeft: '8px',
          whiteSpace: 'nowrap'
        }}>
          {currentVersion.createTime && formatDateTime(currentVersion.createTime)}
        </div>
      </div>

      {/* Viewer */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <Viewer urn={viewerUrn} />
      </div>
    </div>
  );
}

export default VersionViewer;

