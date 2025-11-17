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
                loadModel(viewer, Autodesk.Viewing.toUrlSafeBase64(id));
            } catch (err) {
                console.error('Error loading model:', err);
                alert('Could not load model. See console for details.');
            }
        });
        
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
