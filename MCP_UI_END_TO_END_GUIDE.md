# MCP-UI End-to-End Implementation Guide

Complete guide for running and testing the MCP-UI implementation.

## 📋 Prerequisites

1. **Node.js** installed (v16+)
2. **APS credentials** configured in `.env` file
3. **Two terminal windows** (one for main server, one for MCP-UI app)

## 🚀 Step-by-Step Flow

### Step 1: Start the Main APS Hubs Browser Server

**Terminal 1:**
```bash
cd /Users/gomesj/aps-hubs-browser-nodejs
npm start
```

**Expected output:**
```
Server listening on port 8080...
```

**What this does:**
- Starts Express server on port 8080
- Serves the main web UI
- Provides API endpoints (`/api/hubs`, `/api/auth`, etc.)
- Provides MCP-UI endpoints (`/mcp-ui/resource/:id`, `/mcp-ui/action`)

---

### Step 2: Authenticate in Main App

1. **Open browser**: http://localhost:8080
2. **Click "Login"** button
3. **Log in** with your Autodesk account
4. **Verify**: You should see your hubs/projects in the tree

**Why this matters:**
- Creates a session cookie (`connect.sid`)
- This cookie is needed for MCP-UI API calls (authentication)
- Cookie is shared between localhost:8080 and localhost:3000 (same domain)

---

### Step 3: Start the MCP-UI React App

**Terminal 2:**
```bash
cd /Users/gomesj/aps-hubs-browser-nodejs/mcp-ui-app
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

**What this does:**
- Starts Vite dev server on port 3000
- Serves the React MCP-UI app
- Proxies API calls to localhost:8080 (via vite.config.js)

---

### Step 4: Open MCP-UI App

1. **Open browser**: http://localhost:3000
2. **You should see**: "MCP-UI Test App" with a form

**Note**: The session cookie from Step 2 should be available (same domain)

---

### Step 5: Test MCP-UI Panel

#### Option A: Use the Form

1. **Select Resource Type**: Choose "Project Info", "Folder Actions", or "Hub Overview"
2. **Fill in IDs**:
   - **Project ID**: `a.YnVzaW5lc3M6c3N0dGVzdDEwMTUzI0QyMDI1MDkwNTk3NzU4ODA1MQ`
   - **Hub ID**: `a.YnVzaW5lc3M6c3N0dGVzdDEwMTUz`
   - **Project Name**: `Assets` (optional)
3. **Click**: "Open MCP-UI Panel"
4. **Result**: Panel should appear on the right side with interactive UI

#### Option B: Use Browser Console

Open browser console (F12) and run:

```javascript
// Test Project Info Panel
fetch('/mcp-ui/resource/project/info?projectId=a.YnVzaW5lc3M6c3N0dGVzdDEwMTUzI0QyMDI1MDkwNTk3NzU4ODA1MQ&hubId=a.YnVzaW5lc3M6c3N0dGVzdDEwMTUz&projectName=Assets', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log);
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    END-TO-END FLOW                          │
└─────────────────────────────────────────────────────────────┘

1. Start Main Server (Terminal 1)
   └─> npm start
       └─> Server on :8080

2. Authenticate (Browser)
   └─> http://localhost:8080
       └─> Login → Session Cookie Created

3. Start MCP-UI App (Terminal 2)
   └─> cd mcp-ui-app && npm run dev
       └─> Vite on :3000

4. Open MCP-UI App (Browser)
   └─> http://localhost:3000
       └─> Form appears

5. Trigger Panel
   └─> Fill form → Click "Open MCP-UI Panel"
       └─> Fetch: GET /mcp-ui/resource/project/info?...
           └─> Express Route (with auth middleware)
               └─> Calls: getUIResource('project/info', data)
                   └─> Returns: UI Resource Object
                       └─> React Component renders
                           └─> UIResourceRenderer displays HTML
                               └─> User interacts with panel
                                   └─> Actions sent: POST /mcp-ui/action
                                       └─> Backend processes action
                                           └─> Returns result
```

---

## 🧪 Testing Checklist

### ✅ Server Setup
- [ ] Main server running on :8080
- [ ] MCP-UI app running on :3000
- [ ] No port conflicts

### ✅ Authentication
- [ ] Logged into main app (http://localhost:8080)
- [ ] Session cookie exists (check DevTools → Application → Cookies)
- [ ] Cookie name: `connect.sid`

### ✅ API Endpoints
- [ ] `/mcp-ui/resources` returns list of resources
- [ ] `/mcp-ui/resource/project/info` returns resource (when authenticated)
- [ ] `/mcp-ui/action` accepts POST requests

### ✅ MCP-UI App
- [ ] App loads at http://localhost:3000
- [ ] Form displays correctly
- [ ] Can fill in project/hub IDs
- [ ] Panel opens when clicking button
- [ ] Panel displays UI resource
- [ ] Buttons in panel work (send actions)

---

## 🐛 Troubleshooting

### Issue: 404 on `/mcp-ui/resource/:id`

**Check:**
1. Is main server running? (`curl http://localhost:8080/mcp-ui/resources`)
2. Are you authenticated? (check cookies)
3. Did you restart server after route changes?

**Fix:**
```bash
# Restart main server
cd /Users/gomesj/aps-hubs-browser-nodejs
npm start
```

### Issue: 401 Unauthorized

**Check:**
1. Are you logged into main app?
2. Does session cookie exist?
3. Is cookie being sent? (check Network tab → Request Headers)

**Fix:**
1. Go to http://localhost:8080
2. Log in again
3. Refresh MCP-UI app

### Issue: Panel Not Rendering

**Check:**
1. Browser console for errors
2. Network tab - is resource fetched successfully?
3. Is `UIResourceRenderer` component loaded?

**Debug:**
```javascript
// In browser console
console.log('MCPUI:', window.MCPUI);
console.log('UIResourceRenderer:', MCPUI?.UIResourceRenderer);
```

### Issue: Actions Not Working

**Check:**
1. Network tab - is POST `/mcp-ui/action` being sent?
2. Server logs - is action received?
3. Response status - 200 OK?

**Debug:**
```javascript
// Check action endpoint
fetch('/mcp-ui/action', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    type: 'tool',
    payload: { toolName: 'refreshProject', params: {} }
  })
})
.then(r => r.json())
.then(console.log);
```

---

## 📝 Quick Start Commands

**Copy-paste these commands:**

```bash
# Terminal 1: Main Server
cd /Users/gomesj/aps-hubs-browser-nodejs
npm start

# Terminal 2: MCP-UI App
cd /Users/gomesj/aps-hubs-browser-nodejs/mcp-ui-app
npm run dev
```

**Then:**
1. Open http://localhost:8080 → Login
2. Open http://localhost:3000 → Test MCP-UI

---

## 🎯 Expected Results

### When Working Correctly:

1. **Main App** (http://localhost:8080):
   - Shows hubs/projects tree
   - Can view 3D models
   - Has 🎨 buttons on projects/folders (if integrated)

2. **MCP-UI App** (http://localhost:3000):
   - Shows test form
   - Can open panels
   - Panels display interactive HTML
   - Buttons in panels work
   - Actions are processed

3. **Panel Contents**:
   - **Project Info**: Shows project name, ID, hub ID, refresh button
   - **Folder Actions**: Shows folder name, create/refresh/view buttons
   - **Hub Overview**: Shows hub name, project count

---

## 🔗 Integration Options

### Current: Standalone App
- ✅ Separate React app
- ✅ Easy to develop/debug
- ✅ Can test independently

### Future: Embedded in Main App
1. Build MCP-UI app: `cd mcp-ui-app && npm run build`
2. Copy `dist/` to `wwwroot/mcp-ui/`
3. Include in main app HTML
4. Or serve via Express route

---

## 📚 Files Reference

### Main Server
- `server.js` - Express server
- `routes/mcpUi.js` - MCP-UI API routes
- `server/mcpUiResources/uiResources.js` - UI resource definitions

### MCP-UI App
- `mcp-ui-app/src/App.jsx` - Main React app
- `mcp-ui-app/src/components/McpUIPanel.jsx` - Panel component
- `mcp-ui-app/vite.config.js` - Vite configuration

### MCP Server
- `mcp-server.js` - MCP protocol server (for Cursor integration)

---

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ Both servers start without errors
2. ✅ Can authenticate in main app
3. ✅ MCP-UI app loads without errors
4. ✅ Can fetch resources (check Network tab)
5. ✅ Panel renders with HTML content
6. ✅ Buttons in panel are clickable
7. ✅ Actions are sent and processed
8. ✅ Server logs show action processing

---

## 🆘 Still Having Issues?

1. **Check server logs** - Both terminals should show activity
2. **Check browser console** - Look for errors/warnings
3. **Check Network tab** - Verify requests/responses
4. **Verify authentication** - Session cookie must exist
5. **Restart both servers** - Sometimes fixes routing issues




