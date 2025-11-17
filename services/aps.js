const { AuthenticationClient, ResponseType } = require('@aps_sdk/authentication');
const { DataManagementClient } = require('@aps_sdk/data-management');
const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, INTERNAL_TOKEN_SCOPES, PUBLIC_TOKEN_SCOPES } = require('../config.js');

const authenticationClient = new AuthenticationClient();
const dataManagementClient = new DataManagementClient();
const service = module.exports = {};

service.getAuthorizationUrl = () => authenticationClient.authorize(APS_CLIENT_ID, ResponseType.Code, APS_CALLBACK_URL, INTERNAL_TOKEN_SCOPES);

service.authCallbackMiddleware = async (req, res, next) => {
    const internalCredentials = await authenticationClient.getThreeLeggedToken(APS_CLIENT_ID, req.query.code, APS_CALLBACK_URL, {
        clientSecret: APS_CLIENT_SECRET
    });
    const publicCredentials = await authenticationClient.refreshToken(internalCredentials.refresh_token, APS_CLIENT_ID, {
        clientSecret: APS_CLIENT_SECRET,
        scopes: PUBLIC_TOKEN_SCOPES
    });
    req.session.public_token = publicCredentials.access_token;
    req.session.internal_token = internalCredentials.access_token;
    req.session.refresh_token = publicCredentials.refresh_token;
    req.session.expires_at = Date.now() + internalCredentials.expires_in * 1000;
    next();
};

service.authRefreshMiddleware = async (req, res, next) => {
    const { refresh_token, expires_at } = req.session;
    if (!refresh_token) {
        res.status(401).end();
        return;
    }

    if (expires_at < Date.now()) {
        const internalCredentials = await authenticationClient.refreshToken(refresh_token, APS_CLIENT_ID, {
            clientSecret: APS_CLIENT_SECRET,
            scopes: INTERNAL_TOKEN_SCOPES
        });
        const publicCredentials = await authenticationClient.refreshToken(internalCredentials.refresh_token, APS_CLIENT_ID, {
            clientSecret: APS_CLIENT_SECRET,
            scopes: PUBLIC_TOKEN_SCOPES
        });
        req.session.public_token = publicCredentials.access_token;
        req.session.internal_token = internalCredentials.access_token;
        req.session.refresh_token = publicCredentials.refresh_token;
        req.session.expires_at = Date.now() + internalCredentials.expires_in * 1000;
    }
    req.internalOAuthToken = {
        access_token: req.session.internal_token,
        expires_in: Math.round((req.session.expires_at - Date.now()) / 1000),
    };
    req.publicOAuthToken = {
        access_token: req.session.public_token,
        expires_in: Math.round((req.session.expires_at - Date.now()) / 1000),
    };
    next();
};

service.getUserProfile = async (accessToken) => {
    const resp = await authenticationClient.getUserInfo(accessToken);
    return resp;
};

service.getHubs = async (accessToken) => {
    const resp = await dataManagementClient.getHubs({ accessToken });
    return resp.data;
};

service.getProjects = async (hubId, accessToken) => {
    const resp = await dataManagementClient.getHubProjects(hubId, { accessToken });
    return resp.data;
};

/**
 * Convert folder URN to folder ID format expected by SDK
 * The APS SDK getFolderContents appears to strip the 'urn:' prefix and URL-encode the rest
 * Based on error logs, the SDK expects: adsk.wipprod:fs.folder:co.xxxxx (without urn: prefix)
 * But the API actually needs the full URN. This is a workaround for SDK behavior.
 */
function normalizeFolderId(folderId) {
    if (!folderId) return null;
    
    // The SDK's getFolderContents method seems to strip 'urn:' prefix
    // But based on the folder object links, the API needs the full URN
    // However, the SDK is doing its own processing, so we'll try without the prefix first
    // If that doesn't work, the error handler will retry with the full URN
    
    // Remove 'urn:' prefix if present (SDK seems to expect this)
    if (folderId.startsWith('urn:')) {
        return folderId.substring(4); // Return without 'urn:' prefix
    }
    
    // Return as-is if no prefix
    return folderId;
}

service.getProjectContents = async (hubId, projectId, folderId, accessToken) => {
    if (!folderId) {
        const resp = await dataManagementClient.getProjectTopFolders(hubId, projectId, { accessToken });
        return resp.data;
    } else {
        // Normalize folder ID format
        const normalizedFolderId = normalizeFolderId(folderId);
        console.log('Getting folder contents:', { projectId, folderId, normalizedFolderId });
        
        try {
            // Try with normalized ID first (without urn: prefix, as SDK seems to expect)
            const resp = await dataManagementClient.getFolderContents(projectId, normalizedFolderId, { accessToken });
            return resp.data;
        } catch (error) {
            console.error('Error in getFolderContents with normalized ID:', {
                projectId,
                originalFolderId: folderId,
                normalizedFolderId,
                error: error.message
            });
            
            // If normalized failed and original had 'urn:' prefix, try with full URN
            // The SDK might need the full URN despite what we thought
            if (folderId.startsWith('urn:') && normalizedFolderId !== folderId) {
                console.log('Retrying with full URN (urn: prefix included)...');
                try {
                    const resp = await dataManagementClient.getFolderContents(projectId, folderId, { accessToken });
                    return resp.data;
                } catch (retryError) {
                    console.error('Retry with full URN also failed:', retryError.message);
                    throw error; // Throw original error
                }
            }
            throw error;
        }
    }
};

service.getItemVersions = async (projectId, itemId, accessToken) => {
    const resp = await dataManagementClient.getItemVersions(projectId, itemId, { accessToken });
    return resp.data;
};
