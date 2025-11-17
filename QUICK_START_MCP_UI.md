# MCP-UI Quick Start Guide

## 🚀 Quick Start (Copy-Paste)

### Terminal 1: Main Server
```bash
cd /Users/gomesj/aps-hubs-browser-nodejs
npm start
```

### Terminal 2: MCP-UI App
```bash
cd /Users/gomesj/aps-hubs-browser-nodejs/mcp-ui-app
npm run dev
```

---

## 📍 URLs

- **Main App**: http://localhost:8080
- **MCP-UI App**: http://localhost:3000

---

## ✅ Step-by-Step

1. **Start Main Server** (Terminal 1)
   ```bash
   npm start
   ```
   ✅ Wait for: `Server listening on port 8080...`

2. **Start MCP-UI App** (Terminal 2)
   ```bash
   cd mcp-ui-app
   npm run dev
   ```
   ✅ Wait for: `Local: http://localhost:3000/`

3. **Authenticate** (Browser)
   - Open: http://localhost:8080
   - Click "Login"
   - Log in with Autodesk account
   - ✅ You should see your hubs/projects

4. **Test MCP-UI** (Browser)
   - Open: http://localhost:3000
   - Fill in form:
     - Resource: "Project Info"
     - Project ID: `a.YnVzaW5lc3M6c3N0dGVzdDEwMTUzI0QyMDI1MDkwNTk3NzU4ODA1MQ`
     - Hub ID: `a.YnVzaW5lc3M6c3N0dGVzdDEwMTUz`
     - Project Name: `Assets`
   - Click "Open MCP-UI Panel"
   - ✅ Panel should appear on the right

---

## 🧪 Test Data

Use these IDs from your Fusion Hubs:

**Hub 1: Fusion TFlex Test Hub**
- Hub ID: `a.YnVzaW5lc3M6c3N0dGVzdDEwMTUz`
- Project: Assets
  - Project ID: `a.YnVzaW5lc3M6c3N0dGVzdDEwMTUzI0QyMDI1MDkwNTk3NzU4ODA1MQ`

**Hub 2: Joshua Gomes**
- Hub ID: `a.YnVzaW5lc3M6YXV0b2Rlc2s5NDQ5`
- Project: Assets
  - Project ID: `a.YnVzaW5lc3M6YXV0b2Rlc2s5NDQ5I0QyMDI1MTEwNDEwMDg3ODU3ODE`

---

## 🔍 Verify It's Working

### Check 1: Main Server
```bash
curl http://localhost:8080/mcp-ui/resources
```
✅ Should return: `{"resources":["project/info","folder/actions","hub/overview"]}`

### Check 2: MCP-UI App
- Open http://localhost:3000
- ✅ Should see "MCP-UI Test App" form

### Check 3: Authentication
- Open DevTools (F12) → Application → Cookies
- ✅ Should see `connect.sid` cookie

### Check 4: Panel Opens
- Fill form and click "Open MCP-UI Panel"
- ✅ Panel appears on right side
- ✅ Shows project information
- ✅ Has interactive buttons

---

## 🐛 Common Issues

### "404 Not Found" on `/mcp-ui/resource/:id`
- ✅ Restart main server
- ✅ Check you're authenticated (have session cookie)
- ✅ Verify route: `curl http://localhost:8080/mcp-ui/resources`

### "401 Unauthorized"
- ✅ Log into main app first (http://localhost:8080)
- ✅ Check cookies exist
- ✅ Refresh MCP-UI app

### Panel Not Rendering
- ✅ Check browser console for errors
- ✅ Verify `@mcp-ui/client` loaded
- ✅ Check Network tab - is resource fetched?

---

## 📊 Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  Main Server    │         │   MCP-UI App     │
│  :8080          │◄────────┤  :3000           │
│                 │  Proxy  │                  │
│  - Express      │         │  - React         │
│  - API Routes   │         │  - Vite          │
│  - MCP-UI API   │         │  - UIResource    │
└─────────────────┘         └──────────────────┘
       ▲
       │ Session Cookie
       │
┌─────────────────┐
│   Browser       │
│  - Main App     │
│  - MCP-UI App   │
└─────────────────┘
```

---

## 🎯 What Happens When You Click "Open Panel"

1. **React Component** calls `fetch('/mcp-ui/resource/project/info?...')`
2. **Vite Proxy** forwards to `http://localhost:8080/mcp-ui/resource/project/info?...`
3. **Express Route** (`routes/mcpUi.js`) receives request
4. **Auth Middleware** checks session cookie
5. **Route Handler** calls `getUIResource('project/info', data)`
6. **UI Resource** created with `createUIResource()`
7. **Response** sent back as JSON
8. **React Component** receives resource
9. **UIResourceRenderer** renders HTML in iframe
10. **User** interacts with panel
11. **Actions** sent to `/mcp-ui/action`
12. **Backend** processes action (calls APS APIs, etc.)
13. **Result** returned to panel

---

## 📝 Next Steps

1. ✅ Test all three resource types (project/info, folder/actions, hub/overview)
2. ✅ Test action buttons (refresh, create, etc.)
3. ✅ Customize UI resources in `server/mcpUiResources/uiResources.js`
4. ✅ Add more UI resources as needed
5. ✅ Build and integrate into main app (optional)

---

## 📚 Full Documentation

- **End-to-End Guide**: `MCP_UI_END_TO_END_GUIDE.md`
- **Frontend Integration**: `MCP_UI_FRONTEND_INTEGRATION.md`
- **How to Trigger**: `HOW_TO_TRIGGER_MCP_UI.md`
- **MCP Server**: `MCP_USAGE.md`




