# How to Trigger MCP-UI Panels

This guide shows all the ways to open and interact with MCP-UI panels in the APS Hubs Browser.

## 🎯 Method 1: Automatic Tree Buttons (Easiest)

**What happens**: When you load the app, 🎨 buttons are automatically added to project and folder nodes in the tree.

**How to use**:
1. Start the server: `npm start`
2. Open `http://localhost:8080` and login
3. Expand the tree to see your hubs → projects → folders
4. Look for 🎨 buttons next to project and folder names
5. Click the 🎨 button to open the MCP-UI panel

**What opens**:
- **Projects**: Opens "Project Info Panel" (`project/info`)
- **Folders**: Opens "Folder Actions Panel" (`folder/actions`)

---

## 🔧 Method 2: Browser Console (For Testing)

Open the browser console (F12) and run:

```javascript
// Open Project Info Panel
window.openMcpUIPanel('project/info', {
    projectId: 'a.YnVzaW5lc3M6c3N0dGVzdDEwMTUzI0QyMDI1MDkwNTk3NzU4ODA1MQ',
    hubId: 'a.YnVzaW5lc3M6c3N0dGVzdDEwMTUz',
    projectName: 'Assets'
}, { position: 'sidebar' });

// Open Folder Actions Panel
window.openMcpUIPanel('folder/actions', {
    folderId: 'xxx',
    projectId: 'yyy',
    hubId: 'zzz',
    folderName: 'My Folder'
}, { position: 'sidebar' });

// Open Hub Overview Panel
window.openMcpUIPanel('hub/overview', {
    hubId: 'a.YnVzaW5lc3M6c3N0dGVzdDEwMTUz',
    hubName: 'Fusion TFlex Test Hub',
    projectCount: 3
}, { position: 'sidebar' });
```

---

## 💻 Method 3: Programmatic Integration

Add buttons or triggers in your code:

### Example: Add a Custom Button

```javascript
// In your JavaScript code
const customButton = document.createElement('button');
customButton.textContent = 'Open Project Panel';
customButton.onclick = () => {
    window.openMcpUIPanel('project/info', {
        projectId: 'your-project-id',
        hubId: 'your-hub-id',
        projectName: 'My Project'
    }, { position: 'sidebar' });
};
document.body.appendChild(customButton);
```

### Example: Trigger on Tree Node Click

```javascript
// Modify sidebar.js to add MCP-UI trigger
tree.on('node.click', function (event, node) {
    event.preventTreeDefault();
    const tokens = node.id.split('|');
    
    if (tokens[0] === 'project') {
        // Open MCP-UI panel for projects
        window.openMcpUIPanel('project/info', {
            projectId: tokens[2],
            hubId: tokens[1],
            projectName: node.text
        }, { position: 'sidebar' });
    }
    
    // ... rest of your code
});
```

---

## 🎨 Method 4: Add to Header/Menu

Add a button in the header to open panels:

```html
<!-- In index.html, add to header -->
<button id="mcp-ui-trigger">Open MCP UI</button>
```

```javascript
// In main.js or separate script
document.getElementById('mcp-ui-trigger').onclick = () => {
    // Get selected project/folder from tree, or use default
    window.openMcpUIPanel('project/info', {
        projectId: 'default-project-id',
        hubId: 'default-hub-id'
    });
};
```

---

## 📋 Available UI Resources

You can trigger these resources:

### 1. `project/info`
**Purpose**: Display project metadata and actions
**Required data**:
```javascript
{
    projectId: 'string',
    hubId: 'string',
    projectName: 'string' // optional
}
```

### 2. `folder/actions`
**Purpose**: Folder operations (create item, refresh, view details)
**Required data**:
```javascript
{
    folderId: 'string',
    projectId: 'string',
    hubId: 'string',
    folderName: 'string' // optional
}
```

### 3. `hub/overview`
**Purpose**: Hub statistics and overview
**Required data**:
```javascript
{
    hubId: 'string',
    hubName: 'string', // optional
    projectCount: number // optional
}
```

---

## 🎛️ Panel Options

### Position Options

```javascript
// Sidebar (default) - slides in from right
{ position: 'sidebar' }

// Modal - centered popup
{ position: 'modal' }
```

### Example with Options

```javascript
window.openMcpUIPanel('project/info', {
    projectId: 'xxx',
    hubId: 'yyy'
}, {
    position: 'modal',  // or 'sidebar'
    width: '600px',     // custom width (if needed)
    height: '500px'     // custom height (if needed)
});
```

---

## 🔄 Closing Panels

### Method 1: Close Button
Click the **×** button in the panel header

### Method 2: Programmatic
```javascript
window.closeMcpUIPanel();
```

---

## 🧪 Quick Test

1. **Start server**: `npm start`
2. **Open browser**: `http://localhost:8080`
3. **Login** with your Autodesk account
4. **Open console** (F12)
5. **Run this**:
```javascript
// Get first hub and project from tree
const firstProject = document.querySelector('.inspire-tree-node[data-id*="project"]');
if (firstProject) {
    const nodeId = firstProject.getAttribute('data-id');
    const tokens = nodeId.split('|');
    window.openMcpUIPanel('project/info', {
        projectId: tokens[2],
        hubId: tokens[1],
        projectName: firstProject.textContent.trim()
    });
}
```

---

## 🐛 Troubleshooting

### Panels Not Opening?

1. **Check console** for errors
2. **Verify libraries loaded**:
   ```javascript
   console.log('React:', window.React);
   console.log('ReactDOM:', window.ReactDOM);
   console.log('MCPUI:', window.MCPUI);
   console.log('openMcpUIPanel:', window.openMcpUIPanel);
   ```

3. **Check backend endpoint**:
   ```bash
   curl http://localhost:8080/mcp-ui/resource/project/info?projectId=test&hubId=test
   ```

### Buttons Not Appearing on Tree?

1. **Wait for tree to load** - buttons are added after 1 second
2. **Check tree structure** - ensure nodes have `data-id` attributes
3. **Manually trigger**:
   ```javascript
   window.enhanceTreeWithMcpUI();
   ```

---

## 📝 Summary

**Easiest**: Just click the 🎨 buttons that appear automatically on projects/folders

**For testing**: Use browser console with `window.openMcpUIPanel()`

**For custom integration**: Call `window.openMcpUIPanel()` from your code

**Available resources**: `project/info`, `folder/actions`, `hub/overview`




