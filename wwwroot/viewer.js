async function getAccessToken(callback) {
    try {
        const resp = await fetch('/api/auth/token');
        if (!resp.ok)
            throw new Error(await resp.text());
        const { access_token, expires_in } = await resp.json();
        callback(access_token, expires_in);
    } catch (err) {
        alert('Could not obtain access token. See the console for more details.');
        console.error(err);        
    }
}

export function initViewer(container) {
    return new Promise(function (resolve, reject) {
        Autodesk.Viewing.FeatureFlags.set('DS_ENDPOINTS', true);
        Autodesk.Viewing.Initializer({ env: 'AutodeskProduction', getAccessToken }, function () {
            const config = {
                extensions: ['Autodesk.DocumentBrowser']
            };
            const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
            viewer.start();
            viewer.setTheme('light-theme');
            
            // Add empty state message overlay
            setTimeout(() => {
                if (!viewer.model) {
                    const emptyState = document.createElement('div');
                    emptyState.id = 'viewer-empty-state';
                    emptyState.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #666; font-family: Arial, sans-serif; pointer-events: none; z-index: 1000; background: rgba(255,255,255,0.8); padding: 20px; border-radius: 8px;';
                    emptyState.innerHTML = '<div style="font-size: 18px; margin-bottom: 10px; font-weight: bold;">3D Viewer Ready</div><div style="font-size: 14px;">Select a file version from the tree to view your model</div>';
                    container.appendChild(emptyState);
                    
                    // Remove empty state when model loads
                    viewer.addEventListener(Autodesk.Viewing.MODEL_ADDED_EVENT, function() {
                        const emptyStateEl = document.getElementById('viewer-empty-state');
                        if (emptyStateEl) {
                            emptyStateEl.remove();
                        }
                    });
                }
            }, 500);
            
            resolve(viewer);
        });
    });
}

export function loadModel(viewer, urn) {
    function onDocumentLoadSuccess(doc) {
        viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry());
    }
    function onDocumentLoadFailure(code, message) {
        alert('Could not load model. See console for more details.');
        console.error(message);
    }
    Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
}
