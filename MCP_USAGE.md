# How to Interact with the MCP Server

This guide explains how to set up and interact with the APS Hubs Browser MCP server.

## Prerequisites

1. **Node.js** installed (v16 or later)
2. **APS credentials** configured in your `.env` file
3. An **MCP client** (like Claude Desktop, or any MCP-compatible client)

## Step 1: Get an Access Token

The MCP server needs an access token to authenticate with Autodesk Platform Services. You have two options:

### Option A: Get Token from Web App (Recommended)

1. **Start the Express server**:
   ```bash
   npm start
   ```

2. **Open your browser** and go to `http://localhost:8080`

3. **Log in** with your Autodesk account (this sets up your session)

4. **Get your token** using one of these methods:

   **Method 1: Browser Developer Console** (Easiest)
   - Open Developer Tools (`F12` or `Cmd+Option+I`)
   - Go to the Console tab
   - Run:
     ```javascript
     fetch('/api/auth/mcp-token').then(r => r.json()).then(console.log)
     ```
   - Copy the `access_token` from the response

   **Method 2: Using curl with session cookie**
   - After logging in, open Developer Tools → Application/Storage → Cookies
   - Copy the session cookie value
   - Run:
     ```bash
     curl -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" http://localhost:8080/api/auth/mcp-token
     ```

   **Method 3: Direct browser fetch**
   - In the browser console after logging in:
     ```javascript
     fetch('/api/auth/mcp-token').then(r => r.json()).then(data => console.log('Token:', data.access_token))
     ```

### Option B: Use Environment Variable

Set the `APS_ACCESS_TOKEN` environment variable with a valid token:
```bash
export APS_ACCESS_TOKEN="your-token-here"
```

## Step 2: Configure MCP Client

### For Cursor IDE (Recommended)

Cursor IDE has built-in MCP support and is perfect for development workflows!

1. **Open Cursor Settings**:
   - Press `Cmd+,` (macOS) or `Ctrl+,` (Windows/Linux)
   - Or go to: **Cursor → Settings** (macOS) or **File → Preferences → Settings** (Windows/Linux)

2. **Navigate to MCP Settings**:
   - Search for "MCP" in the settings search bar
   - Or go to: **Features → Model Context Protocol**

3. **Add MCP Server Configuration**:
   - Click "Edit in settings.json" or find the MCP configuration file
   - The configuration file is typically at:
     - **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
     - **Windows**: `%APPDATA%\Cursor\User\globalStorage\mcp.json`
     - **Linux**: `~/.config/Cursor/User/globalStorage/mcp.json`

4. **Add the server configuration**:
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

   **Important**: 
   - Replace `/absolute/path/to/aps-hubs-browser-nodejs` with the actual absolute path to your project directory
   - On Windows, use forward slashes or escaped backslashes: `C:/path/to/project/mcp-server.js` or `C:\\path\\to\\project\\mcp-server.js`

5. **Restart Cursor IDE** for the changes to take effect.

6. **Verify the connection**:
   - Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
   - Search for "MCP" to see available MCP commands
   - You should see your server listed

### For Other MCP Clients

Refer to your MCP client's documentation for how to configure MCP servers. The server uses stdio transport, so configure it accordingly.

## Step 3: Interact with the Server

### In Cursor IDE

Once configured in Cursor, you can interact with the MCP server in several ways:

1. **Through the Chat/Composer**:
   - Open the Chat panel (usually `Cmd+L` / `Ctrl+L`)
   - Use natural language prompts like:
     - "Show me the contents of my Fusion Hubs"
     - "Show me my Fusion model named Words"
   - Cursor will automatically use the MCP server tools

2. **Through Command Palette**:
   - Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
   - Search for "MCP" to see available MCP-related commands
   - You can directly invoke MCP tools

3. **In Code Context**:
   - The MCP server can provide context about your Fusion Hubs when you're working on code
   - Ask questions about your Autodesk data while coding

### In Claude Desktop or Other Clients

Once configured, you can interact with the MCP server through your MCP client using natural language prompts:

### Example Prompts

1. **List all hubs**:
   - "Show me the contents of my Fusion Hubs"
   - "List all my Fusion Hubs"

2. **Search for specific items**:
   - "Show me my Fusion model named Words"
   - "Find the file called 'Assembly'"
   - "Show me the project named 'My Project'"

3. **Browse specific hubs/projects**:
   - "List all projects in my hub"
   - "Show me files in project X"

### Using MCP Tools Directly

If your MCP client supports direct tool calls, you can use:

- `list_hubs` - List all Fusion Hubs
- `list_projects` - List projects in a hub (requires `hubId`)
- `list_files` - List files in a project (requires `hubId` and `projectId`)
- `search_hubs` - Search for items by name
- `handle_prompt` - Handle natural language queries

### Using MCP Resources

You can access resources directly:

- `aps://hubs` - Full tree of all hubs, projects, and files
- `aps://hubs/{hubId}` - Projects in a specific hub
- `aps://hubs/{hubId}/projects/{projectId}` - Files in a specific project

## Step 4: Testing the Server Standalone

You can test the MCP server directly (though it's designed to work with MCP clients):

```bash
# Set your access token
export APS_ACCESS_TOKEN="your-token-here"

# Run the server (it will communicate via stdio)
npm run mcp-server
```

The server communicates via stdio, so it's designed to be used by MCP clients, not directly from the command line.

## Troubleshooting

### "APS_ACCESS_TOKEN environment variable not set"

- Make sure you've set the `APS_ACCESS_TOKEN` environment variable, or
- Ensure the Express server is running and accessible at the URL specified in `APS_SERVER_URL`

### "Could not get token from HTTP endpoint"

- Make sure the Express server is running (`npm start`)
- Check that `APS_SERVER_URL` points to the correct URL
- Verify you're logged in via the web interface

### Server not connecting

- Verify Node.js is in your PATH
- Check that the path to `mcp-server.js` in your MCP client config is correct (use absolute path)
- Check the MCP client logs for error messages

### Token expired

- Re-authenticate via the web app at `http://localhost:8080`
- Get a new token and update your configuration

## Advanced: Using with HTTP Endpoint

If you want the MCP server to automatically get tokens from your Express server:

1. **Start the Express server**:
   ```bash
   npm start
   ```

2. **Log in via the web interface** at `http://localhost:8080`

3. **Configure the MCP server** with `APS_SERVER_URL`:
   ```json
   {
     "mcpServers": {
       "aps-hubs-browser": {
         "command": "node",
         "args": ["/path/to/mcp-server.js"],
         "env": {
           "APS_SERVER_URL": "http://localhost:8080"
         }
       }
     }
   }
   ```

   Note: This requires the session cookie. For better security, use the `APS_ACCESS_TOKEN` method instead.

## Next Steps

- Explore your Fusion Hubs through natural language queries
- Use the viewer URNs returned in tree nodes to view files inline
- Search for specific files, projects, or hubs by name
- Navigate the hierarchical structure of your Autodesk data

