const express = require('express');
const { getAuthorizationUrl, authCallbackMiddleware, authRefreshMiddleware, getUserProfile } = require('../services/aps.js');

let router = express.Router();

router.get('/api/auth/login', function (req, res) {
    res.redirect(getAuthorizationUrl());
});

router.get('/api/auth/logout', function (req, res) {
    req.session = null;
    res.redirect('/');
});

router.get('/api/auth/callback', authCallbackMiddleware, function (req, res) {
    res.redirect('/');
});

router.get('/api/auth/token', authRefreshMiddleware, function (req, res) {
    // Enable CORS for cross-origin requests from React app
    const origin = req.headers.origin;
    if (origin && (origin.startsWith('http://localhost:3000') || origin.startsWith('http://localhost:8080'))) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    // Return token in format expected by Viewer component
    const tokenData = req.publicOAuthToken || {};
    res.json({
        access_token: tokenData.access_token || req.internalOAuthToken?.access_token,
        expires_in: tokenData.expires_in || req.internalOAuthToken?.expires_in,
        ...tokenData
    });
});

router.get('/api/auth/profile', authRefreshMiddleware, async function (req, res, next) {
    try {
        const profile = await getUserProfile(req.internalOAuthToken.access_token);
        res.json({ name: `${profile.name}` });
    } catch (err) {
        next(err);
    }
});

// Endpoint for MCP server to get access token
router.get('/api/auth/mcp-token', authRefreshMiddleware, function (req, res) {
    res.json({ 
        access_token: req.internalOAuthToken.access_token,
        expires_in: req.internalOAuthToken.expires_in
    });
});

module.exports = router;
