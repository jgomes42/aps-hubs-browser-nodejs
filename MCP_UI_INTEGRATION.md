# MCP UI Integration

## Overview
This document describes the MCP UI integration added to the APS Hubs Browser MCP server. The integration enables interactive HTML UI components to be displayed in MCP UI-compatible clients like Cursor.

## What Was Added

### 1. MCP UI Server Package
- ✅ `@mcp-ui/server` package is installed (v5.13.1)
- ✅ Used `createUIResource` to create UI resource objects

### 2. UI Components (`ui-components.js`)
Created reusable HTML components:

- **`createTreeViewHTML(tree, title)`** - Creates an interactive tree view component
  - Expandable/collapsible nodes
  - Icons for different node types (hub, project, folder, file)
  - Click handlers for node selection
  - Viewer integration indicators
  - Responsive styling

- **`createSearchResultsHTML(results, searchTerm)`** - Creates a search results view
  - List of search results with paths
  - Click handlers for result selection
  - Empty state handling

- **`createTreeNodeHTML(node, level)`** - Recursive tree node rendering
  - Proper indentation
  - Expand/collapse indicators
  - Type-specific icons

### 3. Updated MCP Server (`mcp-server.js`)
All tool responses now return both:
- **UI Resource** - Interactive HTML component using `createUIResource`
- **Text Response** - Summary text for accessibility

Updated tools:
- ✅ `list_hubs` - Returns interactive tree view of all hubs
- ✅ `list_projects` - Returns interactive tree view of projects
- ✅ `list_files` - Returns interactive tree view of files/folders
- ✅ `search_hubs` - Returns interactive search results view
- ✅ `handle_prompt` - Returns UI for both search and full tree views

## How It Works

### UI Resource Format
```javascript
createUIResource({
    uri: 'aps://hubs-ui',           // Unique resource URI
    name: 'Fusion Hubs',            // Display name
    mimeType: 'text/html',          // Content type
    text: htmlContent               // HTML content
})
```

### Tool Response Format
```javascript
{
    content: [
        createUIResource({...}),     // UI component
        {
            type: 'text',           // Text summary
            text: 'Found 3 hub(s)...'
        }
    ]
}
```

## Features

### Interactive Tree View
- **Expand/Collapse**: Click the arrow (▶/▼) to expand/collapse nodes
- **Selection**: Click on a node to select it (highlighted in blue)
- **Icons**: Visual indicators for different types:
  - 🏢 Hub
  - 📁 Project
  - 📂 Folder
  - 📄 File/Item
- **Viewer Integration**: Files with viewer URNs show an eye icon (👁️)

### Search Results View
- **Clickable Results**: Click any result to select it
- **Path Display**: Shows full path (Hub > Project > File)
- **Empty State**: Shows message when no results found

## Integration with Cursor

### Configuration
The MCP server is already configured in `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "aps-hubs-browser": {
      "command": "node",
      "args": ["/path/to/mcp-server.js"],
      "env": {
        "APS_ACCESS_TOKEN": "...",
        "APS_SERVER_URL": "http://localhost:8080"
      }
    }
  }
}
```

### Usage in Cursor
1. **Restart Cursor** after configuration
2. **Ask in chat**: "Show me the contents of my Fusion Hubs"
3. **View UI**: The interactive tree view should render in the chat interface
4. **Interact**: Click nodes to expand/collapse and explore

### Testing
To test the MCP UI integration:
```bash
# Make sure the server is configured correctly
# Then in Cursor chat, try:
- "Show me the contents of my Fusion Hubs"
- "List all my Fusion Hubs"
- "Search for files named 'Assembly'"
```

## Technical Details

### HTML Structure
The UI components generate self-contained HTML with:
- Inline CSS for styling (no external dependencies)
- JavaScript for interactivity
- Event handlers for MCP UI integration
- Responsive design

### Tree Node Structure
```javascript
{
    id: "hub|{hub-id}",
    name: "Hub Name",
    type: "hub",
    children: true,  // or array of child nodes
    hubId: "...",
    // ... other metadata
}
```

### Event Handling
The HTML includes JavaScript that:
- Handles expand/collapse clicks
- Manages node selection
- Emits events for MCP UI integration (if `window.mcpUI` is available)

## Next Steps

### Potential Enhancements
1. **Lazy Loading**: Load children on-demand when nodes are expanded
2. **Viewer Integration**: Open Autodesk Viewer when clicking view icon
3. **Breadcrumb Navigation**: Show path to current selection
4. **Filtering**: Add search/filter within tree view
5. **Keyboard Navigation**: Support arrow keys for navigation

### Testing Checklist
- [ ] Verify UI renders in Cursor chat
- [ ] Test expand/collapse functionality
- [ ] Test node selection
- [ ] Test search results display
- [ ] Verify viewer URN indicators
- [ ] Test with multiple hubs/projects
- [ ] Test error handling

## Troubleshooting

### UI Not Rendering
- Check that Cursor version supports MCP UI
- Verify MCP server is running
- Check browser console for errors
- Ensure `@mcp-ui/server` package is installed

### Tree Not Expanding
- Verify tree structure has `children: true` or array
- Check JavaScript console for errors
- Ensure HTML is properly escaped

### Styling Issues
- Check that inline CSS is being applied
- Verify no CSS conflicts with Cursor's styles
- Test in different Cursor themes

## References
- [MCP UI Documentation](https://modelcontextprotocol.io/docs/ui)
- [@mcp-ui/server Package](https://www.npmjs.com/package/@mcp-ui/server)




