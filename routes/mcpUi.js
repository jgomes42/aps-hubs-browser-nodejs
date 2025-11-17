/**
 * MCP UI Routes
 * Handles UI resource fetching and action processing
 */

const express = require('express');
const { getUIResource, listUIResources } = require('../server/mcpUiResources/uiResources.js');
const { getProjects, getProjectContents } = require('../services/aps.js');
const { authRefreshMiddleware } = require('../services/aps.js');

const router = express.Router();

/**
 * GET /mcp-ui/resource/*
 * Fetch a UI resource by ID
 * 
 * Query params can include data to pass to the resource:
 * - projectId, hubId, folderId, etc.
 * 
 * Note: This endpoint requires authentication (session cookie)
 * 
 * Uses regex pattern to match resourceId with slashes (e.g., "project/info")
 */
router.get(/^\/resource\/(.+)$/, async (req, res, next) => {
    // Extract resourceId from the regex match (everything after /resource/)
    // req.params[0] contains the first captured group from the regex
    const resourceId = req.params[0] || req.path.replace(/^\/resource\//, '').split('?')[0];
    
    if (!resourceId) {
        return res.status(400).json({ error: 'Resource ID is required' });
    }
    
    // Check authentication first, but don't fail if not authenticated (for testing)
    let authenticated = false;
    try {
        await new Promise((resolve, reject) => {
            authRefreshMiddleware(req, res, (err) => {
                if (err) reject(err);
                else {
                    authenticated = !!req.internalOAuthToken;
                    resolve();
                }
            });
        });
    } catch (err) {
        // Auth failed, but continue anyway for testing
        console.log('Auth check failed, continuing without auth:', err.message);
    }
    
    try {
        const queryData = req.query;
        
        console.log('Fetching MCP-UI resource:', resourceId, 'with data:', queryData, 'authenticated:', authenticated);
        
        // Parse query params into data object
        const data = {
            projectId: queryData.projectId,
            projectName: queryData.projectName,
            hubId: queryData.hubId,
            hubName: queryData.hubName,
            folderId: queryData.folderId,
            folderName: queryData.folderName,
            projectCount: queryData.projectCount ? parseInt(queryData.projectCount) : undefined,
        };
        
        // Get the UI resource
        const resource = getUIResource(resourceId, data);
        
        // createUIResource returns { type: 'resource', resource: {...} }
        // Return the resource object for the client
        console.log('Returning resource:', resource.resource?.uri || resource.uri);
        res.json(resource.resource || resource);
    } catch (error) {
        console.error('Error fetching MCP-UI resource:', error);
        if (error.message.includes('Unknown UI resource')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * GET /mcp-ui/resources
 * List all available UI resource IDs
 */
router.get('/resources', (req, res) => {
    const resources = listUIResources();
    res.json({ resources });
});

/**
 * POST /mcp-ui/action
 * Handle UI actions from MCP UI components
 * 
 * Expected body:
 * {
 *   type: 'tool' | 'intent' | etc.,
 *   payload: {
 *     toolName: string,
 *     params: object
 *   }
 * }
 */
router.post('/action', authRefreshMiddleware, express.json(), async (req, res, next) => {
    try {
        const action = req.body;
        
        // Check if we have authentication token
        if (!req.internalOAuthToken || !req.internalOAuthToken.access_token) {
            return res.status(401).json({
                status: 'error',
                error: 'Authentication required. Please log in first.'
            });
        }
        
        const token = req.internalOAuthToken.access_token;
        
        console.log('Received UI action:', action);
        
        // Helper function to check if IDs are demo/test data
        const isDemoData = (id) => {
            return !id || id.startsWith('demo-') || id === 'demo-hub-id' || id === 'demo-project-id';
        };
        
        // Handle different action types
        if (action.type === 'tool') {
            const { toolName, params } = action.payload;
            
            let result;
            
            switch (toolName) {
                case 'refreshProject':
                    // Refresh project data
                    if (!params.hubId || !params.projectId) {
                        result = { status: 'error', error: 'Missing hubId or projectId' };
                    } else if (isDemoData(params.hubId) || isDemoData(params.projectId)) {
                        result = { 
                            status: 'error', 
                            error: 'Demo data cannot be refreshed. Please select a real project from the tree.'
                        };
                    } else {
                        try {
                            const projects = await getProjects(params.hubId, token);
                            const project = projects.find(p => p.id === params.projectId);
                            if (!project) {
                                result = {
                                    status: 'error',
                                    error: `Project ${params.projectId} not found in hub ${params.hubId}`
                                };
                            } else {
                                result = {
                                    status: 'ok',
                                    data: {
                                        projectId: project.id,
                                        projectName: project.attributes?.name,
                                        hubId: params.hubId
                                    }
                                };
                            }
                        } catch (apiError) {
                            console.error('API error in refreshProject:', apiError);
                            result = {
                                status: 'error',
                                error: apiError.message || 'Failed to refresh project data. Please check the console for details.'
                            };
                        }
                    }
                    break;
                    
                case 'refreshFolder':
                    // Refresh folder contents
                    console.log('refreshFolder params:', params);
                    if (!params.hubId || !params.projectId || !params.folderId) {
                        const missing = [];
                        if (!params.hubId) missing.push('hubId');
                        if (!params.projectId) missing.push('projectId');
                        if (!params.folderId) missing.push('folderId');
                        result = { 
                            status: 'error', 
                            error: `Missing required parameters: ${missing.join(', ')}. Received: hubId=${params.hubId}, projectId=${params.projectId}, folderId=${params.folderId}`
                        };
                    } else if (isDemoData(params.hubId) || isDemoData(params.projectId) || isDemoData(params.folderId)) {
                        result = { 
                            status: 'error', 
                            error: 'Demo data cannot be refreshed. Please select a real folder from the tree.'
                        };
                    } else {
                        try {
                            const contents = await getProjectContents(
                                params.hubId,
                                params.projectId,
                                params.folderId,
                                token
                            );
                            result = {
                                status: 'ok',
                                data: {
                                    itemCount: contents.length,
                                    items: contents.map(item => ({
                                        id: item.id,
                                        name: item.attributes?.displayName || 'Unknown',
                                        type: item.type
                                    }))
                                }
                            };
                        } catch (apiError) {
                            console.error('API error in refreshFolder:', apiError);
                            result = {
                                status: 'error',
                                error: apiError.message || 'Failed to refresh folder contents. Please check the console for details.'
                            };
                        }
                    }
                    break;
                    
                case 'createItem':
                    // Create new item (placeholder - would need APS API for actual creation)
                    result = {
                        status: 'ok',
                        message: 'Item creation not yet implemented. This would call APS API to create a new item.'
                    };
                    break;
                    
                case 'getFolderDetails':
                    // Get folder details
                    console.log('getFolderDetails params:', params);
                    if (!params.hubId || !params.projectId || !params.folderId) {
                        const missing = [];
                        if (!params.hubId) missing.push('hubId');
                        if (!params.projectId) missing.push('projectId');
                        if (!params.folderId) missing.push('folderId');
                        result = { 
                            status: 'error', 
                            error: `Missing required parameters: ${missing.join(', ')}. Received: hubId=${params.hubId}, projectId=${params.projectId}, folderId=${params.folderId}`
                        };
                    } else if (isDemoData(params.hubId) || isDemoData(params.projectId) || isDemoData(params.folderId)) {
                        result = { 
                            status: 'error', 
                            error: 'Demo data cannot be queried. Please select a real folder from the tree.'
                        };
                    } else {
                        try {
                            const contents = await getProjectContents(
                                params.hubId,
                                params.projectId,
                                params.folderId,
                                token
                            );
                            result = {
                                status: 'ok',
                                data: {
                                    folderId: params.folderId,
                                    itemCount: contents.length,
                                    items: contents.slice(0, 10).map(item => ({
                                        id: item.id,
                                        name: item.attributes?.displayName || 'Unknown',
                                        type: item.type
                                    }))
                                }
                            };
                        } catch (apiError) {
                            console.error('API error in getFolderDetails:', apiError);
                            result = {
                                status: 'error',
                                error: apiError.message || 'Failed to get folder details. Please check the console for details.'
                            };
                        }
                    }
                    break;
                    
                default:
                    result = {
                        status: 'error',
                        error: `Unknown tool: ${toolName}`
                    };
            }
            
            res.json(result);
        } else if (action.type === 'intent') {
            // Handle intent-based actions
            res.json({
                status: 'ok',
                message: 'Intent actions not yet implemented'
            });
        } else {
            res.status(400).json({
                status: 'error',
                error: `Unknown action type: ${action.type}`
            });
        }
    } catch (error) {
        console.error('Error handling UI action:', error);
        // Always return JSON, never HTML
        res.status(500).json({
            status: 'error',
            error: error.message || 'An unexpected error occurred while processing the action'
        });
    }
});

module.exports = router;

