import { initViewer, loadModel } from './viewer.js';
import { initTree } from './sidebar.js';

const login = document.getElementById('login');
if (!login) {
    console.error('Login button not found in DOM');
    throw new Error('Required DOM element not found');
}

try {
    const resp = await fetch('/api/auth/profile');
    if (resp.ok) {
        const user = await resp.json();
        login.innerText = `Logout (${user.name || 'User'})`;
        login.onclick = () => {
            const iframe = document.createElement('iframe');
            iframe.style.visibility = 'hidden';
            iframe.src = 'https://accounts.autodesk.com/Authentication/LogOut';
            document.body.appendChild(iframe);
            iframe.onload = () => {
                window.location.replace('/api/auth/logout');
                document.body.removeChild(iframe);
            };
            iframe.onerror = () => {
                // If iframe fails, still try to logout
                window.location.replace('/api/auth/logout');
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            };
        };
        
        const previewContainer = document.getElementById('preview');
        if (!previewContainer) {
            throw new Error('Preview container not found');
        }
        
        const viewer = await initViewer(previewContainer);
        const treeContainer = document.querySelector('#tree');
        if (!treeContainer) {
            throw new Error('Tree container not found');
        }
        
        initTree('#tree', (id) => {
            if (!id) {
                console.error('Invalid ID provided to loadModel');
                return;
            }
            try {
                console.log('🌲 Main App - Tree node clicked, ID:', id);
                console.log('🌲 Main App - ID type:', typeof id);
                console.log('🌲 Main App - Encoding to base64...');
                
                const encodedUrn = Autodesk.Viewing.toUrlSafeBase64(id);
                console.log('🌲 Main App - Encoded URN:', encodedUrn);
                
                loadModel(viewer, encodedUrn);
            } catch (err) {
                console.error('Error loading model:', err);
                alert('Could not load model. See console for details.');
            }
        });
        
        // Function to load version in viewer
        function loadVersionInViewer(messageData) {
            const { viewerUrn, itemId, versionName, viewerUrl } = messageData;
            
            // Use itemId (lineage URN) if available, otherwise use viewerUrn
            // The itemId format is: urn:adsk.wipprod:dm.lineage:xxx which is what the viewer needs
            const urnToLoad = itemId || viewerUrn;
            
            if (urnToLoad) {
                try {
                    console.log('Loading URN in viewer:', urnToLoad);
                    // The viewer expects the URN to be base64 encoded
                    // Autodesk.Viewing.toUrlSafeBase64 handles the encoding
                    const encodedUrn = Autodesk.Viewing.toUrlSafeBase64(urnToLoad);
                    console.log('Encoded URN for viewer:', encodedUrn);
                    loadModel(viewer, encodedUrn);
                    console.log(`Successfully loaded version "${versionName || urnToLoad}" in inline viewer`);
                    return true;
                } catch (err) {
                    console.error('Error loading version in viewer:', err);
                    console.error('Error details:', {
                        message: err.message,
                        stack: err.stack,
                        urnToLoad: urnToLoad
                    });
                    return false;
                }
            }
            return false;
        }
        
        // Listen for messages from MCP-UI panels to load versions in viewer
        // Accept messages from any origin (since MCP UI panels might be in iframes or separate windows)
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'load-viewer-version') {
                console.log('Main window received load-viewer-version message:', event.data);
                
                if (loadVersionInViewer(event.data)) {
                    // Successfully loaded
                    return;
                }
                
                // Fallback: open in new window
                const { viewerUrl } = event.data;
                if (viewerUrl) {
                    console.log('Falling back to opening viewer in new window');
                    window.open(viewerUrl, '_blank');
                } else {
                    alert('Could not load version in viewer. See console for details.');
                }
            }
        });
        
        // Poll server for viewer load requests from React app (cross-origin communication)
        // The React app POSTs to /mcp-ui/notify-viewer-load, and we poll /mcp-ui/poll-viewer-load
        let pollCount = 0;
        const pollInterval = setInterval(async () => {
            try {
                pollCount++;
                const response = await fetch('/mcp-ui/poll-viewer-load', {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.hasRequest && data.request) {
                        console.log('✅ Found viewer load request from server!', data.request);
                        console.log('Polling attempt:', pollCount);
                        console.log('Request details:', {
                            itemId: data.request.itemId,
                            versionId: data.request.versionId,
                            versionName: data.request.versionName,
                            viewerUrn: data.request.viewerUrn
                        });
                        
                        // Load the version
                        const loadSuccess = loadVersionInViewer(data.request);
                        if (loadSuccess) {
                            console.log('✅ Successfully loaded version in inline viewer');
                        } else {
                            console.warn('❌ Failed to load version in viewer, falling back to new window');
                            // Fallback to opening URL
                            if (data.request.viewerUrl) {
                                window.open(data.request.viewerUrl, '_blank');
                            }
                        }
                    } else {
                        // No request found - log occasionally for debugging
                        if (pollCount % 20 === 0) { // Log every 10 seconds (20 * 500ms)
                            console.log('Polling for viewer load requests... (poll count:', pollCount + ', no requests found)');
                        }
                    }
                } else {
                    console.warn('Polling endpoint returned error:', response.status, response.statusText);
                }
            } catch (err) {
                // Ignore polling errors (server might be down, etc.)
                // Only log if it's not a network error
                if (err.name !== 'TypeError' || !err.message.includes('fetch')) {
                    console.warn('Error polling for viewer load requests:', err);
                }
            }
        }, 500); // Check every 500ms
        
        console.log('Started polling for viewer load requests from React app');
        
        // MCP-UI visualizations are handled by the standalone React app at http://localhost:3000
        // The MCP server exposes UI resources that can be consumed by MCP UI clients
    } else {
        login.innerText = 'Login';
        login.onclick = () => window.location.replace('/api/auth/login');
    }
    login.style.visibility = 'visible';
} catch (err) {
    console.error('Application initialization error:', err);
    alert('Could not initialize the application. See console for more details.');
    // Still show login button even on error
    if (login) {
        login.style.visibility = 'visible';
        login.innerText = 'Login';
        login.onclick = () => window.location.replace('/api/auth/login');
    }
}
