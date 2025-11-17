# MCP-UI Standalone React App

A standalone React application for testing and using MCP-UI resources from the APS Hubs Browser.

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open**: http://localhost:3000

## Usage

1. Make sure the main APS Hubs Browser server is running (`npm start` in parent directory)
2. Log in to the main app at http://localhost:8080 (to get session cookie)
3. Open this MCP-UI app at http://localhost:3000
4. Fill in the form with your project/hub IDs
5. Click "Open MCP-UI Panel"

## Features

- ✅ Clean React app with proper tooling
- ✅ Easy to debug with React DevTools
- ✅ Proper JSX support
- ✅ Vite for fast development
- ✅ Proxy to main server for API calls
- ✅ Session cookie support for authentication

## Building for Production

```bash
npm run build
```

The built files will be in `dist/` and can be served statically or embedded in the main app.

## Integration Options

### Option 1: Standalone (Current)
- Run on separate port (3000)
- Good for development and testing
- Can be embedded as iframe in main app

### Option 2: Embed in Main App
- Build the React app
- Copy `dist/` files to `wwwroot/mcp-ui/`
- Include in main app's HTML

### Option 3: Proxy Route
- Add route in main Express server to serve MCP-UI app
- Single port, integrated experience




