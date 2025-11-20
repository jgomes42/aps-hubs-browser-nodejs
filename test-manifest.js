const fetch = require('node-fetch');

// Test if the manifest exists for this URN
async function checkManifest() {
    const urn = 'urn:adsk.wipprod:fs.file:vf.nhObHZNYTKW01X_Ow7ocpA';
    const encodedUrn = Buffer.from(urn).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    
    console.log('Original URN:', urn);
    console.log('Encoded URN:', encodedUrn);
    console.log('Checking manifest at:', `https://cdn.derivative.autodesk.com/derivativeservice/v2/manifest/${encodedUrn}`);
    
    // Note: This will fail without a valid token, but we can see the error
    try {
        const response = await fetch(
            `https://cdn.derivative.autodesk.com/derivativeservice/v2/manifest/${encodedUrn}`,
            {
                headers: {
                    'Authorization': 'Bearer <token-would-go-here>'
                }
            }
        );
        console.log('Response status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkManifest();
