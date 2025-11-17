# Hubs Browser (Node.js)

![platforms](https://img.shields.io/badge/platform-windows%20%7C%20osx%20%7C%20linux-lightgray.svg)
[![node.js](https://img.shields.io/badge/Node.js-16.16-blue.svg)](https://nodejs.org)
[![npm](https://img.shields.io/badge/npm-8.11-blue.svg)](https://www.npmjs.com/)
[![license](https://img.shields.io/:license-mit-green.svg)](https://opensource.org/licenses/MIT)

[Autodesk Platform Services](https://aps.autodesk.com) application built by following
the [Hubs Browser](https://tutorials.autodesk.io/tutorials/hubs-browser/) tutorial
from https://tutorials.autodesk.io.

![thumbnail](thumbnail.png)

## Development

### Prerequisites

- [APS credentials](https://aps.autodesk.com/en/docs/oauth/v2/tutorials/create-app)
- Provisioned access to [BIM 360 Docs](https://aps.autodesk.com/en/docs/bim360/v1/tutorials/getting-started/manage-access-to-docs/)
or Autodesk Construction Cloud
- [Node.js](https://nodejs.org) (Long Term Support version is recommended)
- Command-line terminal such as [PowerShell](https://learn.microsoft.com/en-us/powershell/scripting/overview)
or [bash](https://en.wikipedia.org/wiki/Bash_(Unix_shell)) (should already be available on your system)

> We recommend using [Visual Studio Code](https://code.visualstudio.com) which, among other benefits,
> provides an [integrated terminal](https://code.visualstudio.com/docs/terminal/basics) as well.

### Setup & Run

- Clone this repository: `git clone https://github.com/autodesk-platform-services/aps-hubs-browser-nodejs`
- Go to the project folder: `cd aps-hubs-browser-nodejs`
- Install Node.js dependencies: `npm install`
- Open the project folder in a code editor of your choice
- Create a _.env_ file in the project folder, and populate it with the snippet below,
replacing `<client-id>` and `<client-secret>` with your APS Client ID and Client Secret,
and `<secret-phrase>` with an arbitrary string:

```bash
APS_CLIENT_ID="<client-id>"
APS_CLIENT_SECRET="<client-secret>"
APS_CALLBACK_URL="http://localhost:8080/api/auth/callback" # URL your users will be redirected to after logging in with their Autodesk account
SERVER_SESSION_SECRET="<secret-phrase>" # phrase used to encrypt/decrypt server session cookies
```

> For applications deployed to a custom domain, the callback URL will be `http://<your-domain>/api/auth/callback`
> or `https://<your-domain>/api/auth/callback`. Do not forget to update the callback URL for your application
> in https://aps.autodesk.com/myapps as well.

- Run the application, either from your code editor, or by running `npm start` in terminal
- Open http://localhost:8080

> When using [Visual Studio Code](https://code.visualstudio.com), you can run & debug
> the application by pressing `F5`.

## MCP (Model Context Protocol) Integration

This project includes an MCP server that enables integration with MCP-UI enabled experiences, allowing you to interact with your Fusion Hubs, Projects, and Files through natural language prompts.

### MCP Server Features

- **Tree View Navigation**: Browse hubs, projects, and files in a hierarchical tree structure
- **Natural Language Queries**: Use prompts like "Show me the contents of my Fusion Hubs" or "Show me my Fusion model named Words"
- **Search Functionality**: Search for specific hubs, projects, or files by name
- **Viewer Integration**: Access viewer URNs for files to enable inline viewing in MCP-UI

### Setting Up the MCP Server

**📖 For detailed setup and usage instructions, see [MCP_USAGE.md](MCP_USAGE.md)**

Quick start:

1. **Get an access token**:
   - Start the Express server: `npm start`
   - Log in at http://localhost:8080
   - Get token: `curl http://localhost:8080/api/auth/mcp-token`

2. **Configure your MCP client** (Cursor IDE, Claude Desktop, etc.):
   
   **For Cursor IDE**: Open Settings → Search "MCP" → Edit configuration file
   
   **For Claude Desktop**: Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
   
   Add this configuration:
   ```json
   {
     "mcpServers": {
       "aps-hubs-browser": {
         "command": "node",
         "args": ["/absolute/path/to/aps-hubs-browser-nodejs/mcp-server.js"],
         "env": {
           "APS_ACCESS_TOKEN": "your-access-token-here",
           "APS_SERVER_URL": "http://localhost:8080"
         }
       }
     }
   }
   ```

3. **Restart your MCP client** and start using prompts like:
   - "Show me the contents of my Fusion Hubs"
   - "Show me my Fusion model named Words"

### Available MCP Tools

- `list_hubs` - List all Fusion Hubs
- `list_projects` - List projects in a specific hub
- `list_files` - List files and folders in a project
- `search_hubs` - Search for hubs, projects, or files by name
- `get_file_viewer_urn` - Get the URN for viewing a file in the Autodesk Viewer
- `handle_prompt` - Handle natural language prompts about Fusion Hubs

### Available MCP Resources

- `aps://hubs` - Tree view of all Fusion Hubs, Projects, and Files
- `aps://hubs/{hubId}` - Tree view of projects in a specific hub
- `aps://hubs/{hubId}/projects/{projectId}` - Tree view of files and folders in a project

### Example Prompts for MCP-UI

- "Show me the contents of my Fusion Hubs"
- "Show me my Fusion model named Words"
- "List all projects in my hub"
- "Find the file called 'Assembly'"

The MCP server will parse these prompts and return appropriate tree-structured data that MCP-UI can render as an inline navigable tree view.

## MCP-UI Integration

This project includes full MCP-UI integration with structured UI resources and action handling.

### UI Resources

Structured UI resources are available in `server/mcpUiResources/uiResources.js`:

- **Project Info Panel** (`ui://project/info`) - Displays project metadata with refresh action
- **Folder Actions Panel** (`ui://folder/actions`) - Provides folder operations (create item, refresh, view details)
- **Hub Overview Panel** (`ui://hub/overview`) - Shows hub statistics

### Express Endpoints

The server exposes MCP-UI endpoints:

- `GET /mcp-ui/resource/:resourceId` - Fetch a UI resource by ID
  - Query params: `projectId`, `hubId`, `folderId`, etc. for dynamic data
  - Example: `GET /mcp-ui/resource/project/info?projectId=xxx&hubId=yyy`
  
- `GET /mcp-ui/resources` - List all available UI resource IDs

- `POST /mcp-ui/action` - Handle UI actions from MCP UI components
  - Body: `{ type: 'tool', payload: { toolName: string, params: object } }`
  - Returns: `{ status: 'ok' | 'error', data?: any, error?: string }`

### Adding New UI Resources

1. Create a new resource function in `server/mcpUiResources/uiResources.js`:
```javascript
function createMyPanel(data = {}) {
    return createUIResource({
        uri: 'ui://my/panel',
        name: 'My Panel',
        mimeType: 'text/html',
        text: '<html>...</html>'
    });
}
```

2. Add it to `uiResourceMap`:
```javascript
const uiResourceMap = {
    // ... existing resources
    'my/panel': (data) => createMyPanel(data),
};
```

3. The resource will be available at `GET /mcp-ui/resource/my/panel`

### Action Protocol

UI resources can send actions via `window.parent.postMessage()`:

```javascript
const action = {
    type: 'tool',
    payload: {
        toolName: 'refreshProject',
        params: { hubId: 'xxx', projectId: 'yyy' }
    }
};
window.parent.postMessage(action, '*');
```

The `POST /mcp-ui/action` endpoint handles these actions and can:
- Call APS APIs
- Refresh data
- Perform operations
- Return results to the UI

See `routes/mcpUi.js` for implementation details.

### Documentation

- `MCP_UI_INTEGRATION.md` - Complete MCP UI integration guide
- `MCP_UI_PROMPT_TACK_STATUS.md` - Implementation status vs prompt-tack requirements
- `MCP_USAGE.md` - MCP server usage guide

## Troubleshooting

Please contact us via https://aps.autodesk.com/en/support/get-help.

## License

This sample is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT).
Please see the [LICENSE](LICENSE) file for more details.
