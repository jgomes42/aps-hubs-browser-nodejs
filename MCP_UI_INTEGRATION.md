# MCP UI Integration

## Overview
This document describes the MCP UI integration added to the APS Hubs Browser. The implementation is **specification-compliant** and includes:
- MCP server that generates properly formatted UI resources
- Express backend for serving resources via HTTP
- Standalone React app that demonstrates UI resource rendering
- Full Autodesk Viewer integration with 3D model interaction

**Current Status**: All features implemented and validated in standalone React app. Awaiting MCP UI protocol support in mainstream clients (Cursor IDE, Claude Desktop) for full end-to-end validation.

## Architecture

### Dual-Mode Implementation

```
┌─────────────────────────────────────┐
│   MCP Client (Future)               │
│   (Cursor IDE / Claude Desktop)     │
│   ⚠️  MCP UI Protocol Not Yet       │
│      Supported by Cursor            │
└──────────────┬──────────────────────┘
               │ stdio / JSON-RPC
               │ (when supported)
┌──────────────▼──────────────────────┐
│   MCP Server (mcp-server.js)        │
│   - Generates UI resources          │
│   - Handles tool calls              │
│   - @mcp-ui/server                  │
└──────────────┬──────────────────────┘
               │
               │
┌──────────────▼──────────────────────┐
│   Express Server (server.js)        │
│   - OAuth2 authentication           │
│   - Serves UI resources via HTTP    │
│   - Routes: /mcp-ui/*               │
└──────────────┬──────────────────────┘
               │ HTTP
               │
┌──────────────▼──────────────────────┐
│   Standalone React App              │
│   (mcp-ui-app/) - PORT 3000         │
│   - Demonstrates UI rendering       │
│   - Uses @mcp-ui/client             │
│   - Autodesk Viewer integration     │
│   - Version navigation              │
└─────────────────────────────────────┘
```

## What Was Added

## What Was Added

### 1. MCP UI Server Package
- ✅ `@mcp-ui/server` package installed (v5.13.1)
- ✅ `@mcp-ui/client` package installed for React app (v5.13.1)
- ✅ Used `createUIResource` to create MCP UI-compliant resource objects
- ✅ Server generates specification-compliant UI resources

### 2. UI Components (`ui-components.js`)
Created reusable HTML components for MCP UI resources:

- **`createTreeViewHTML(tree, title)`** - Interactive tree view component
  - ✅ Expandable/collapsible nodes with animations
  - ✅ Icons for different node types (hub, project, folder, file)
  - ✅ Click handlers for node selection
  - ✅ Viewer integration indicators
  - ✅ Responsive styling with inline CSS
  - ✅ postMessage support for action handling

- **`createSearchResultsHTML(results, searchTerm)`** - Search results view
  - ✅ List of search results with paths
  - ✅ Click handlers for result selection
  - ✅ Empty state handling
  - ✅ Breadcrumb-style path display

- **`createTreeNodeHTML(node, level)`** - Recursive tree node rendering
  - ✅ Proper indentation based on hierarchy level
  - ✅ Expand/collapse indicators
  - ✅ Type-specific icons and styling

### 3. Updated MCP Server (`mcp-server.js`)
All tool responses now return:
- **UI Resource** - Interactive HTML component using `createUIResource`
- **Text Response** - Summary text for accessibility

Updated tools:
- ✅ `list_hubs` - Returns interactive tree view of all hubs
- ✅ `list_projects` - Returns interactive tree view of projects
- ✅ `list_files` - Returns interactive tree view of files/folders
- ✅ `search_hubs` - Returns interactive search results view
- ✅ `get_file_viewer_urn` - Returns viewer URN for 3D model viewing
- ✅ `handle_prompt` - Natural language query processing with UI responses

### 4. Express Backend Routes (`routes/mcpUi.js`)
New HTTP endpoints for UI resource serving:
- ✅ `GET /mcp-ui/resource/:resourceId` - Fetch specific UI resource
- ✅ `GET /mcp-ui/resources` - List available UI resources
- ✅ `POST /mcp-ui/action` - Handle UI action requests (tool calls, intents)
- ✅ `GET /mcp-ui/api/item/:projectId/:itemId/versions` - Fetch item versions
- ✅ CORS configuration with credentials support

### 5. Standalone React Application (`mcp-ui-app/`)
New React app for demonstrating MCP UI functionality:

**Key Components**:
- **`App.jsx`** - Main app with React Router
- **`McpUIPanel.jsx`** - Renders UI resources using `@mcp-ui/client`
- **`VersionViewer.jsx`** - Dedicated version viewer with navigation
- **`Viewer.jsx`** - Autodesk Viewer integration via iframe

**Features**:
- ✅ Renders MCP UI resources using `UIResourceRenderer`
- ✅ Handles postMessage communication with UI resources
- ✅ Full Autodesk Viewer integration with 3D model interaction
- ✅ Version navigation (previous/next, dropdown selection)
- ✅ OAuth2 authentication integration
- ✅ React Router for client-side navigation

### 6. Autodesk Viewer Integration
Complete 3D viewer implementation:
- ✅ Iframe-based viewer (`wwwroot/viewer-iframe.html`)
- ✅ Same-origin token authentication (no CORS issues)
- ✅ Full interaction support (drag, zoom, pan, select)
- ✅ Model loading from file version URNs
- ✅ postMessage communication between iframe and parent
- ✅ Error handling for 401/404/translation issues
- ✅ Loading states and progress indicators

### 7. Structured UI Resources (`server/mcpUiResources/uiResources.js`)
Organized UI resource definitions:
- ✅ Folder actions panel
- ✅ Item versions panel  
- ✅ Project information views
- ✅ Reusable UI templates

## How It Works

### Current Implementation: HTTP + React App

**1. User Accesses React App**
```
http://localhost:3000
  ↓
React App loads
  ↓
Fetches UI resources from Express server
  ↓
Renders using @mcp-ui/client
```

**2. UI Resource Fetching**
```javascript
// React app fetches from Express
fetch('http://localhost:8080/mcp-ui/resource/folder/actions?projectId=...', {
    credentials: 'include'  // Include session cookies
})
```

**3. Action Handling**
```javascript
// When user clicks in UI resource
UI component → postMessage → React wrapper → HTTP POST to /mcp-ui/action → Express → APS API
```

### Future: MCP Protocol via Cursor IDE

**When Cursor IDE supports MCP UI** (not yet available):
```
User in Cursor: "Show me my Fusion Hubs"
  ↓
Cursor calls MCP server via stdio
  ↓
MCP server generates UI resource
  ↓
Returns via JSON-RPC
  ↓
Cursor renders HTML in sidebar/panel
  ↓
User interacts with UI
  ↓
Actions sent back via MCP protocol
```

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
        createUIResource({
            uri: 'ui://aps-hubs/browser',
            name: 'Fusion Hubs',
            mimeType: 'text/html',
            text: htmlContent  // Self-contained HTML with CSS and JS
        }),
        {
            type: 'text',
            text: 'Found 3 hub(s)...'  // Accessibility text
        }
    ]
}
```

## Features

### 1. Interactive Tree View
**Status**: ✅ Implemented and validated in React app

- **Expand/Collapse**: Click the arrow (▶/▼) to expand/collapse nodes
- **Selection**: Click on a node to select it (highlighted in blue)
- **Icons**: Visual indicators for different types:
  - 🏢 Hub
  - 📁 Project
  - 📂 Folder
  - 📄 File/Item
- **Viewer Integration**: Files with viewer URNs show an eye icon (👁️)
- **Lazy Loading**: Children loaded on-demand when nodes expanded
- **Animation**: Smooth transitions for expand/collapse

### 2. Search Results View
**Status**: ✅ Implemented and validated in React app

- **Clickable Results**: Click any result to navigate
- **Path Display**: Shows full breadcrumb path (Hub › Project › File)
- **Empty State**: Helpful message when no results found
- **Result Metadata**: Shows file type, modification date
- **Filtering**: Filter results by file type

### 3. Autodesk Viewer Integration
**Status**: ✅ Fully functional in React app

**Features**:
- **3D Model Loading**: Load any translated ACC/BIM 360 model
- **Full Interaction**:
  - ✅ Drag to rotate model
  - ✅ Mouse wheel to zoom
  - ✅ Right-drag to pan
  - ✅ Click to select objects
  - ✅ Toolbar interactions
  - ✅ View cube navigation
- **Version Navigation**:
  - Previous/Next version buttons
  - Version dropdown selector
  - Version metadata display
- **Authentication**: Seamless token management via same-origin requests
- **Error Handling**: Clear messages for 401/404/translation errors

### 4. OAuth2 Authentication
**Status**: ✅ Working in web context

- **3-Legged OAuth**: Full Autodesk login flow
- **Session Management**: HTTP-only secure cookies
- **Token Refresh**: Automatic refresh before expiration
- **CORS Support**: Cross-origin requests with credentials
- **Security**: Tokens never exposed to client code

### 5. Natural Language Queries
**Status**: ✅ Implemented, ready for MCP client

- **Query Parsing**: `handle_prompt` tool processes natural language
- **Supported Patterns**:
  - "Show me the contents of my Fusion Hubs"
  - "Find the file named Assembly"
  - "List all projects in Manufacturing hub"
  - "Show me versions of this file"
- **Context-Aware Responses**: Returns appropriate UI for query

## Getting Started

### Prerequisites
- Node.js installed
- Autodesk Platform Services account
- APS Client ID and Client Secret

### Setup

1. **Install Dependencies**
```bash
# Install server dependencies
npm install

# Install React app dependencies
cd mcp-ui-app
npm install
cd ..
```

2. **Configure Environment**
Create `.env` file:
```env
APS_CLIENT_ID=your_client_id
APS_CLIENT_SECRET=your_client_secret
APS_CALLBACK_URL=http://localhost:8080/api/auth/callback
SESSION_SECRET=your_random_secret
```

3. **Start the Application**

**Terminal 1 - Express Server** (OAuth + API):
```bash
npm start
# Runs on http://localhost:8080
```

**Terminal 2 - React App** (UI):
```bash
cd mcp-ui-app
npm run dev
# Runs on http://localhost:3000
```

4. **Access the Application**
- Open browser to `http://localhost:3000`
- Click "Login" to authenticate with Autodesk
- Browse your hubs, projects, files
- View 3D models in the integrated viewer

### Current Usage (Standalone React App)

**1. Browse Hubs and Projects**
```
http://localhost:3000
  ↓
Login with Autodesk
  ↓
Tree view loads with your hubs
  ↓
Click to expand hubs → projects → folders → files
```

**2. View 3D Models**
```
Click on a file version
  ↓
Viewer opens in dedicated route
  ↓
Model loads with full 3D interaction
  ↓
Navigate between versions using controls
```

**3. Search for Files**
```
Use search functionality in UI
  ↓
Results show matching files
  ↓
Click to navigate to file
```

### Future Usage (When Cursor Supports MCP UI)

**⚠️ Not Yet Available** - Cursor IDE doesn't support MCP UI protocol yet.

When support arrives:

1. **Configure MCP Server**
```json
// ~/.cursor/mcp.json
{
  "mcpServers": {
    "aps-hubs-browser": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server.js"],
      "env": {
        "APS_CLIENT_ID": "...",
        "APS_CLIENT_SECRET": "...",
        "APS_CALLBACK_URL": "http://localhost:8080/api/auth/callback",
        "SESSION_SECRET": "..."
      }
    }
  }
}
```

2. **Start Express Server** (for OAuth callbacks):
```bash
npm start
```

3. **Use in Cursor**:
```
Open Cursor IDE
  ↓
In chat: "Show me the contents of my Fusion Hubs"
  ↓
Interactive UI should render (when supported)
  ↓
Click to explore and interact
```

## Technical Details

### HTML Structure
The UI components generate self-contained HTML with:
- ✅ Inline CSS for styling (no external dependencies)
- ✅ Embedded JavaScript for interactivity
- ✅ postMessage event handlers for MCP UI integration
- ✅ Responsive design that adapts to container size
- ✅ Proper frame size metadata (`mcpui.dev/ui-preferred-frame-size`)

### Tree Node Structure
```javascript
{
    id: "hub|{hub-id}",
    name: "Hub Name",
    type: "hub",        // hub | project | folder | file
    children: true,     // or array of child nodes
    hubId: "...",
    projectId: "...",   // for non-hub nodes
    folderId: "...",    // for files
    urnId: "...",       // for viewable files
    // ... other metadata
}
```

### Event Handling
The HTML includes JavaScript that:
- Handles expand/collapse clicks
- Manages node selection state
- Emits postMessage events for action handling
- Communicates with parent window (`window.parent.postMessage`)
- Handles viewer integration actions

### Action Types

**Tool Actions** (Execute backend tools):
```javascript
{
    type: 'tool',
    payload: {
        toolName: 'getFolderDetails',
        hubId: '...',
        projectId: '...',
        folderId: '...'
    }
}
```

**Intent Actions** (User intentions):
```javascript
{
    type: 'intent',
    payload: {
        intent: 'view_version',
        itemId: '...',
        versionId: '...',
        projectId: '...',
        hubId: '...'
    }
}
```

### Communication Flow

**In Standalone React App** (Current):
```
UI Resource (iframe)
  ↓ postMessage
React Component (McpUIPanel)
  ↓ HTTP POST
Express Server (/mcp-ui/action)
  ↓
APS API
  ↓
Response back through chain
```

**In MCP Client** (Future):
```
UI Resource (iframe)
  ↓ postMessage
MCP Client (Cursor IDE)
  ↓ JSON-RPC over stdio
MCP Server
  ↓
APS API (via Express OAuth)
  ↓
Response back via JSON-RPC
```

### Autodesk Viewer Architecture

**Iframe Approach** (avoids CORS issues):
```
React App (localhost:3000)
  └─> Viewer.jsx
       └─> <iframe src="localhost:8080/viewer-iframe.html?urn=..." />
            ├─> Same origin as Express server
            ├─> Fetches token from /api/auth/token (no CORS)
            ├─> Loads Autodesk Viewer SDK
            ├─> Renders 3D model with full interaction
            └─> postMessage to communicate with parent
```

**Key Benefits**:
1. Same-origin token fetching (no CORS)
2. Full viewer functionality preserved
3. Drag/zoom/pan work natively
4. No cross-origin security issues

### URN Format Discovery

**Critical Finding**: File version URNs must include `?version=N` query parameter:

```javascript
// ✅ CORRECT - Works for ACC/BIM 360 files
const urn = 'urn:adsk.wipprod:fs.file:vf.xxx?version=3';

// ❌ WRONG - Causes 401/404 errors
const urn = 'urn:adsk.wipprod:fs.file:vf.xxx';  // Missing version

// ❌ WRONG - This is the lineage URN, not file version
const urn = 'urn:adsk.wipprod:dm.lineage:xxx';
```

The Model Derivative service uses the full file version URN (with `?version=N`) to locate the correct derivatives.

## Current Status

### ✅ What's Working

**Standalone React App** (http://localhost:3000):
- ✅ OAuth2 authentication with Autodesk
- ✅ Browse hubs, projects, folders, files
- ✅ Interactive tree view with expand/collapse
- ✅ Search functionality
- ✅ 3D viewer with full interaction (drag, zoom, pan)
- ✅ Version navigation (previous/next, dropdown)
- ✅ MCP UI resource rendering via `@mcp-ui/client`
- ✅ postMessage communication between UI and app
- ✅ CORS configuration with credentials

**MCP Server** (mcp-server.js):
- ✅ Generates specification-compliant UI resources
- ✅ All tools return proper MCP UI format
- ✅ Natural language query processing
- ✅ Ready for stdio/JSON-RPC transport

**Express Backend** (server.js):
- ✅ OAuth2 flow working
- ✅ Session management
- ✅ UI resource serving via HTTP
- ✅ Action handling endpoint
- ✅ Custom API endpoints for versions

### ⚠️ What's Pending

**MCP Client Support**:
- ⚠️ Cursor IDE doesn't support MCP UI protocol yet
- ⚠️ Claude Desktop support unclear
- ⚠️ Cannot test UI rendering via actual MCP protocol (stdio)
- ⚠️ Cannot test action handling via JSON-RPC
- ⚠️ Cannot validate OAuth when MCP server runs as stdio process

**What Needs Validation When Client Support Arrives**:
1. UI resources render correctly in MCP client
2. postMessage actions routed through MCP protocol
3. Authentication works with stdio-based MCP server
4. Token sharing between stdio server and HTTP OAuth server
5. End-to-end user experience in native MCP context

## Testing

### Current Testing (Standalone App)

**1. Setup and Access**
```bash
# Terminal 1
npm start

# Terminal 2  
cd mcp-ui-app && npm run dev

# Browser
open http://localhost:3000
```

**2. Test Checklist**
- [x] Login with Autodesk OAuth
- [x] Browse hubs and expand tree nodes
- [x] Click to select nodes (highlight works)
- [x] Search for files
- [x] Click file version to open viewer
- [x] Test 3D viewer interactions:
  - [x] Drag to rotate
  - [x] Zoom in/out
  - [x] Pan
  - [x] Click to select
  - [x] Toolbar buttons
- [x] Navigate between versions
- [x] Test with multiple hubs/projects
- [x] Verify error handling (401, 404)

### Future Testing (When Cursor Supports MCP UI)

**⚠️ Not Yet Possible**

When Cursor IDE adds MCP UI support, test:
- [ ] UI renders in Cursor chat/sidebar
- [ ] Tree expand/collapse works via MCP protocol
- [ ] Actions routed through stdio/JSON-RPC
- [ ] Natural language queries work ("Show me my Fusion Hubs")
- [ ] Viewer integration works in MCP context
- [ ] Authentication flow works with stdio server
- [ ] Error handling in MCP client

### Manual Testing Commands

**Test Natural Language (Server-Side)**:
```bash
# Start MCP server manually
node mcp-server.js

# Send MCP request (would come from client)
# This tests server logic, not UI rendering
```

**Test UI Generation**:
```bash
# Server generates UI resources correctly
curl http://localhost:8080/mcp-ui/resource/folder/actions?projectId=xxx

# Should return JSON with HTML content
```

## Potential Enhancements

### Short Term (Standalone App)
1. ✅ **Lazy Loading** - Implemented: Children load on-demand
2. ✅ **Viewer Integration** - Implemented: Full 3D viewer with interaction
3. ⚠️ **Breadcrumb Navigation** - Partially: Version viewer has paths
4. ⚠️ **Filtering** - Basic search implemented, could enhance
5. ❌ **Keyboard Navigation** - Not yet implemented

### Medium Term (When MCP Client Support Arrives)
1. **Validate in Cursor IDE** - Test all features via MCP protocol
2. **Optimize for MCP Context** - Adjust UI for sidebar/panel rendering
3. **Improve Natural Language** - Enhance query parsing with NLP library
4. **Add More Intents** - Support more user actions (download, share, etc.)

### Long Term
1. **Collaboration Features** - Show who's viewing/editing
2. **Real-time Updates** - WebSocket for live data
3. **Offline Support** - Cache data for offline browsing
4. **Advanced Viewer** - Comparison mode, annotations, measurements
5. **Git Integration** - Link versions to commits
6. **CI/CD Integration** - Trigger builds from UI

## Troubleshooting

### Standalone React App Issues

**UI Not Loading**
- ✅ Check both servers are running (8080 and 3000)
- ✅ Verify .env file has correct credentials
- ✅ Check browser console for errors
- ✅ Ensure you're logged in (visit /api/auth/login)

**OAuth Errors**
- ✅ Verify APS_CLIENT_ID and APS_CLIENT_SECRET
- ✅ Check APS_CALLBACK_URL matches exactly
- ✅ Ensure callback URL registered in APS app
- ✅ Try clearing browser cookies and re-authenticating

**Viewer Not Loading**
- ✅ Check that file has been translated (404 = not translated)
- ✅ Verify token has `viewables:read` scope
- ✅ Check URN includes `?version=N` query parameter
- ✅ Look for CORS errors (should use same-origin iframe)

**401 Unauthorized Errors**
- ✅ Check token hasn't expired (automatic refresh should work)
- ✅ Verify session cookie is being sent (`credentials: 'include'`)
- ✅ Check CORS headers include `Access-Control-Allow-Credentials: true`
- ✅ Ensure file has derivatives (upload to Autodesk first)

**404 Not Found for API Endpoints**
- ✅ Check Express server is running on port 8080
- ✅ Verify route order (specific routes before general)
- ✅ Check URL encoding for itemId and projectId

**Infinite Token Fetches**
- ✅ Verify token caching is working (check `tokenCache`)
- ✅ Ensure useEffect dependencies are correct
- ✅ Check for navigation loops (use `navigatingRef`)

### Future: MCP Client Issues

**UI Not Rendering in Cursor** (When supported)
- Check Cursor version supports MCP UI protocol
- Verify MCP server is running and connected
- Check Cursor console for errors
- Ensure `@mcp-ui/server` package is installed

**MCP Server Not Starting**
- Check Node.js version (requires 18+)
- Verify all dependencies installed
- Check stderr output for errors
- Ensure no port conflicts

**Actions Not Working**
- Verify action handlers are registered
- Check JSON-RPC message format
- Look for protocol errors in logs
- Ensure authentication is working

## Key Learnings

### What We Discovered

1. **MCP UI Resource Format is Powerful**
   - Can contain complex JavaScript applications
   - Iframe approach works well for sophisticated UIs
   - postMessage provides clean communication

2. **Authentication with MCP UI**
   - OAuth2 works in web context
   - Stdio MCP server + HTTP OAuth server pattern needed
   - Session management requires careful design
   - Token sharing across processes is a challenge

3. **Viewer Integration**
   - Same-origin iframe solves CORS issues
   - Full 3D interaction works perfectly
   - File version URNs must include `?version=N`
   - Translation is required before viewing

4. **MCP Client Support is Key**
   - Specification is well-designed
   - Implementation is straightforward
   - Client support is the missing piece
   - Standalone app validates approach

### Architecture Decisions

1. **Dual-Mode Design**
   - HTTP server for OAuth and standalone app
   - MCP server for protocol compliance
   - Shared business logic
   - Gradual migration path

2. **Iframe for Viewer**
   - Avoids CORS complexity
   - Preserves full interactivity
   - Same-origin benefits
   - Clean separation of concerns

3. **Standalone App for Validation**
   - Proves UI resources work
   - Tests `@mcp-ui/client` integration
   - Provides working demo
   - Not a replacement for MCP client

## References
- [MCP UI Documentation](https://modelcontextprotocol.io/docs/ui)
- [@mcp-ui/server Package](https://www.npmjs.com/package/@mcp-ui/server)
- [@mcp-ui/client Package](https://www.npmjs.com/package/@mcp-ui/client)
- [Autodesk Platform Services](https://aps.autodesk.com/)
- [Autodesk Viewer](https://aps.autodesk.com/en/docs/viewer/v7/developers_guide/overview/)

## Summary

**What We Built**:
- ✅ Complete MCP UI server (specification-compliant)
- ✅ Express backend for OAuth and HTTP serving
- ✅ Standalone React app demonstrating all features
- ✅ Full Autodesk Viewer integration
- ✅ Interactive tree views, search, version navigation

**What Works**:
- ✅ All features functional in standalone app
- ✅ OAuth2 authentication
- ✅ 3D viewer with full interaction
- ✅ MCP UI resources render correctly via `@mcp-ui/client`

**What's Pending**:
- ⚠️ MCP client support (Cursor IDE, Claude Desktop)
- ⚠️ End-to-end validation via MCP protocol
- ⚠️ Authentication with stdio-based MCP server

**Bottom Line**: Implementation is complete and validated in standalone app. When MCP UI client support arrives, the server is ready to serve properly formatted resources via the MCP protocol with minimal changes needed.




