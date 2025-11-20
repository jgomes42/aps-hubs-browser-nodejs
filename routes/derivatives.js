const express = require('express');
const { getClient, getInternalToken } = require('../services/aps.js');
const { ModelDerivativeClient, Region } = require('@aps_sdk/model-derivative');

let router = express.Router();

/**
 * Check if a file has been translated
 * GET /api/derivatives/manifest/:urn
 */
router.get('/manifest/:urn', async function (req, res, next) {
    try {
        const urn = req.params.urn;
        console.log('Checking manifest for URN:', urn);
        
        const token = await getInternalToken();
        const client = getClient();
        const derivativesApi = new ModelDerivativeClient(client);
        
        try {
            const manifest = await derivativesApi.getManifest(urn, Region.Us);
            console.log('Manifest found:', manifest.status);
            res.json({
                status: manifest.status,
                progress: manifest.progress,
                manifest: manifest
            });
        } catch (err) {
            if (err.response && err.response.status === 404) {
                // Manifest not found = not translated yet
                res.json({
                    status: 'not-translated',
                    progress: '0%'
                });
            } else {
                throw err;
            }
        }
    } catch (err) {
        console.error('Error checking manifest:', err);
        next(err);
    }
});

/**
 * Trigger translation for a file
 * POST /api/derivatives/translate
 * Body: { urn: string }
 */
router.post('/translate', async function (req, res, next) {
    try {
        const { urn } = req.body;
        if (!urn) {
            return res.status(400).json({ error: 'URN is required' });
        }
        
        console.log('Triggering translation for URN:', urn);
        
        const token = await getInternalToken();
        const client = getClient();
        const derivativesApi = new ModelDerivativeClient(client);
        
        const job = {
            input: {
                urn: urn
            },
            output: {
                formats: [
                    {
                        type: 'svf',
                        views: ['2d', '3d']
                    }
                ]
            }
        };
        
        const result = await derivativesApi.startJob(job, Region.Us);
        console.log('Translation started:', result);
        
        res.json({
            status: 'success',
            message: 'Translation started',
            result: result
        });
    } catch (err) {
        console.error('Error starting translation:', err);
        if (err.response && err.response.status === 409) {
            // Already being translated
            res.json({
                status: 'already-translating',
                message: 'Translation already in progress'
            });
        } else {
            next(err);
        }
    }
});

module.exports = router;

