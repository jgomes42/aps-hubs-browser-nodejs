# MCP-UI Frontend Integration

## Overview

MCP-UI has been successfully integrated into the existing APS Hubs Browser frontend. The integration allows you to render interactive MCP UI resources directly in your web application.

## Architecture

### Components

1. **`mcp-ui-panel.js`** - React component that fetches and renders MCP UI resources
2. **`mcp-ui-integration.js`** - Vanilla JS integration layer that bridges React components with the existing app
3. **Updated `index.html`** - Includes React, ReactDOM, and MCP-UI client libraries
4. **Updated `main.css`** - Styles for MCP-UI panels

### How It Works

1. **Resource Fetching**: When a panel is opened, it fetches the UI resource from `/mcp-ui/resource/:resourceId`
2. **Rendering**: Uses `UIResourceRenderer` from `@mcp-ui/client` to render the resource
3. **Action Handling**: UI actions are sent to `/mcp-ui/action` endpoint
4. **Integration**: React components coexist with vanilla JS code

## Usage

### Opening an MCP-UI Panel

```javascript
// Open a project info panel
openMcpUIPanel('project/info', {
    projectId: 'xxx',
    hubId: 'yyy',
    projectName: 'My Project'
}, { position: 'sidebar' });

// Open a folder actions panel
openMcpUIPanel('folder/actions', {
    folderId: 'xxx',
    projectId: 'yyy',
    hubId: 'zzz',
    folderName: 'My Folder'
}, { position: 'sidebar' });
```

### Automatic Integration

The integration automatically adds 🎨 buttons to project and folder nodes in the tree. Clicking these buttons opens the appropriate MCP-UI panel.

### Manual Integration

You can also trigger panels programmatically:

```javascript
// In your code
window.openMcpUIPanel('project/info', {
    projectId: selectedProjectId,
    hubId: selectedHubId
});
```

## Features

### ✅ What's Working

- ✅ React components integrated into vanilla JS app
- ✅ MCP-UI resource fetching from Express backend
- ✅ UIResourceRenderer rendering HTML resources
- ✅ Action handling (tool calls, intents)
- ✅ Automatic tree node enhancement (buttons on projects/folders)
- ✅ Sidebar panel positioning
- ✅ Modal panel positioning (optional)
- ✅ Close button functionality

### 🎨 UI Resources Available

1. **Project Info Panel** (`project/info`)
   - Shows project metadata
   - Refresh button
   - Dynamic data injection

2. **Folder Actions Panel** (`folder/actions`)
   - Create new item button
   - Refresh contents button
   - View details button

3. **Hub Overview Panel** (`hub/overview`)
   - Hub statistics
   - Project count

## Testing

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Open the app**: `http://localhost:8080`

3. **Login** with your Autodesk account

4. **Look for 🎨 buttons** on project and folder nodes in the tree

5. **Click a button** to open an MCP-UI panel

6. **Interact** with the panel (click buttons, etc.)

7. **Check console** for action logs

## Customization

### Adding New UI Resources

1. Create the resource in `server/mcpUiResources/uiResources.js`
2. Add it to `uiResourceMap`
3. Use `openMcpUIPanel('your/resource/id', data)` to open it

### Styling

Modify `main.css` to customize:
- Panel width/height
- Colors
- Positioning
- Animations

### Theming

You can pass initial render data to UI resources:

```javascript
openMcpUIPanel('project/info', {
    projectId: 'xxx',
    theme: 'dark', // Custom data
    userPreferences: {...}
});
```

## Troubleshooting

### Panel Not Showing

- Check browser console for errors
- Verify React and MCP-UI libraries loaded (check Network tab)
- Ensure `/mcp-ui/resource/:id` endpoint works

### Actions Not Working

- Check that `/mcp-ui/action` endpoint is accessible
- Verify authentication (panel needs valid session)
- Check console for action logs

### React Errors

- Ensure React and ReactDOM are loaded before `mcp-ui-panel.js`
- Check that `MCPUI` global is available (from `@mcp-ui/client`)

## Next Steps

1. **Add More UI Resources**: Create additional panels for different use cases
2. **Enhance Styling**: Match MCP-UI panels with your app's design system
3. **Add Animations**: Smooth panel open/close transitions
4. **Remote DOM Support**: Use Remote DOM resources for better integration
5. **Custom Component Library**: Map remote DOM elements to your React components

## Files Modified/Created

- ✅ `wwwroot/mcp-ui-panel.js` - React component
- ✅ `wwwroot/mcp-ui-integration.js` - Integration layer
- ✅ `wwwroot/index.html` - Added React/MCP-UI libraries
- ✅ `wwwroot/main.css` - Panel styles
- ✅ `wwwroot/main.js` - Initialize integration
- ✅ `routes/mcpUi.js` - Backend endpoints (already existed)
- ✅ `server/mcpUiResources/uiResources.js` - UI resources (already existed)

## Benefits

1. **No Separate App**: Everything in one frontend
2. **Seamless Integration**: MCP-UI panels feel like part of the app
3. **Reusable**: Same UI resources work in MCP clients and web UI
4. **Interactive**: Full support for buttons, actions, etc.
5. **Maintainable**: Clear separation between vanilla JS and React




