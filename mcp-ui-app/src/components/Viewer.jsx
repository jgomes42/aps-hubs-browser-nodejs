import React, { useEffect, useRef, useState } from 'react';

/**
 * Autodesk Viewer Component for React App
 * Uses an iframe to embed the viewer from the main app (port 8080)
 * This avoids CORS issues since the viewer runs on the same origin as the backend
 */
const Viewer = React.memo(function Viewer({ urn, accessToken, onError }) {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewerReady, setViewerReady] = useState(false);

  // Get the main app URL (port 8080)
  const mainAppUrl = window.location.origin.replace(':3000', ':8080') || 'http://localhost:8080';

  // Load model in iframe - memoized to avoid recreating on every render
  const loadModelInIframe = React.useCallback((urnToLoad) => {
    if (!iframeRef.current?.contentWindow || !viewerReady) {
      console.warn('Iframe not ready yet, will load when ready');
      return;
    }

    if (!urnToLoad) {
      console.warn('No URN provided to load');
      return;
    }

    console.log('📤 Sending load-model message to iframe:', urnToLoad);
    setLoading(true);
    setError(null);

    // Send message to iframe to load the model
    iframeRef.current.contentWindow.postMessage(
      {
        type: 'load-model',
        urn: urnToLoad
      },
      mainAppUrl
    );
  }, [viewerReady, mainAppUrl]);

  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event) => {
      // Only accept messages from our viewer iframe
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const { type, urn: messageUrn, code, message } = event.data || {};

      switch (type) {
        case 'viewer-ready':
          console.log('✅ Viewer iframe is ready');
          setViewerReady(true);
          setLoading(false);
          // If we have a URN, load it now
          if (urn && iframeRef.current?.contentWindow) {
            loadModelInIframe(urn);
          }
          break;

        case 'viewer-model-loaded':
          console.log('✅ Model loaded successfully in iframe:', messageUrn);
          setLoading(false);
          setError(null);
          break;

        case 'viewer-error':
          console.error('❌ Viewer error:', code, message);
          const errorMsg = message || `Failed to load model (error code: ${code})`;
          setError(errorMsg);
          setLoading(false);
          if (onError) {
            onError(errorMsg);
          }
          break;

        default:
          // Ignore other message types
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [urn, onError, loadModelInIframe]);

  // Load model when URN changes
  useEffect(() => {
    if (urn && viewerReady) {
      loadModelInIframe(urn);
    }
  }, [urn, viewerReady, loadModelInIframe]);

  // Build iframe URL - include URN as query parameter if available
  const iframeUrl = React.useMemo(() => {
    const url = new URL(`${mainAppUrl}/viewer-iframe.html`);
    // Don't include URN in URL - we'll send it via postMessage instead
    // This avoids double-encoding issues
    return url.toString();
  }, [mainAppUrl]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div>Loading viewer...</div>
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          background: 'rgba(255, 0, 0, 0.1)',
          padding: '20px',
          borderRadius: '8px',
          color: '#d32f2f',
          textAlign: 'center',
          maxWidth: '80%'
        }}>
          <div>{error}</div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={iframeUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none'
        }}
        title="Autodesk Viewer"
        allow="fullscreen"
        onLoad={() => {
          console.log('Iframe loaded');
          // The iframe will send a 'viewer-ready' message when it's initialized
        }}
        onError={(e) => {
          console.error('Iframe load error:', e);
          setError('Failed to load viewer iframe');
          setLoading(false);
        }}
      />
    </div>
  );
});

export default Viewer;
