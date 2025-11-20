const express = require('express');
const session = require('cookie-session');
const { PORT, SERVER_SESSION_SECRET } = require('./config.js');

let app = express();

// CORS middleware for ALL requests (must be before other middleware)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Only apply CORS to /mcp-ui routes
    if (req.path.startsWith('/mcp-ui')) {
        // Allow requests from React app (port 3000) or same origin (port 8080)
        if (origin && (origin.startsWith('http://localhost:3000') || origin.startsWith('http://localhost:8080'))) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
        } else if (origin) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
        } else {
            res.header('Access-Control-Allow-Origin', '*');
        }
        
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Handle preflight OPTIONS requests - MUST return before body parsing
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
    }
    
    next();
});

app.use(express.static('wwwroot'));
app.use(session({ secret: SERVER_SESSION_SECRET, maxAge: 24 * 60 * 60 * 1000 }));
app.use(express.json()); // For parsing JSON in POST requests
app.use(require('./routes/auth.js'));
app.use(require('./routes/hubs.js'));
app.use('/mcp-ui', require('./routes/mcpUi.js')); // MCP UI routes - mounted at /mcp-ui
app.listen(PORT, () => console.log(`Server listening on port ${PORT}...`));
