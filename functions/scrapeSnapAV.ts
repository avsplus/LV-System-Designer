import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as cheerio from 'npm:cheerio@1.0.0-rc.12';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const username = Deno.env.get('PORTAL_IO_USERNAME');
        const password = Deno.env.get('PORTAL_IO_PASSWORD');

        // Authenticate and get user API key from Portal.io API
        const apiAppId = Deno.env.get('PORTAL_IO_APP_ID');
        const apiSecret = Deno.env.get('PORTAL_IO_API_SECRET');
        
        if (!apiAppId || !apiSecret) {
            return Response.json({ 
                error: 'Missing Portal.io API credentials. Please set PORTAL_IO_APP_ID and PORTAL_IO_API_SECRET' 
            }, { status: 401 });
        }

        // Create signature for authentication
        const timestamp = new Date().toUTCString();
        const signatureString = `GEThttps://sandbox.api.portal.io/authenticate/apikeyexchange${timestamp}`;
        
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(apiSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureString));
        const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

        // Get user API key
        const authResponse = await fetch(
            `https://sandbox.api.portal.io/authenticate/apikeyexchange?Username=${encodeURIComponent(username)}&Password=${encodeURIComponent(password)}`,
            {
                headers: {
                    'X-MSS-API-APPID': apiAppId,
                    'X-MSS-CUSTOM-DATE': timestamp,
                    'X-MSS-SIGNATURE': signatureBase64,
                },
            }
        );

        if (!authResponse.ok) {
            const errorText = await authResponse.text();
            return Response.json({ 
                error: 'Failed to authenticate with Portal.io API', 
                status: authResponse.status,
                response: errorText 
            }, { status: 401 });
        }

        const authData = await authResponse.json();
        const userApiKey = authData.UserKey;

        // Get catalog items
        const catalogTimestamp = new Date().toUTCString();
        const catalogSignature = `GEThttps://sandbox.api.portal.io/catalog${catalogTimestamp}${userApiKey}`;
        
        const catalogKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(apiSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const catalogSig = await crypto.subtle.sign('HMAC', catalogKey, encoder.encode(catalogSignature));
        const catalogSigBase64 = btoa(String.fromCharCode(...new Uint8Array(catalogSig)));

        const catalogResponse = await fetch('https://sandbox.api.portal.io/catalog', {
            headers: {
                'Accept': 'application/json',
                'X-MSS-API-APPID': apiAppId,
                'X-MSS-CUSTOM-DATE': catalogTimestamp,
                'X-MSS-SIGNATURE': catalogSigBase64,
                'X-MSS-API-USERKEY': userApiKey,
            },
        });

        if (!catalogResponse.ok) {
            const errorText = await catalogResponse.text();
            return Response.json({ 
                error: 'Failed to fetch catalog from Portal.io', 
                status: catalogResponse.status,
                response: errorText 
            }, { status: 500 });
        }

        const catalogData = await catalogResponse.json();

        const products = [];

        // Parse catalog items from Portal.io API
        if (catalogData.items && Array.isArray(catalogData.items)) {
            catalogData.items.forEach(item => {
                const brand = item.brand || item.manufacturer || 'Unknown';
                const model = item.name || item.model || 'Unknown Model';
                const description = item.description || '';
                const price = item.retailPrice || item.price || null;
                const imageUrl = item.imageUrl || item.image || null;
                
                // Determine category
                let category = 'receivers';
                const productText = (model + ' ' + description + ' ' + brand).toLowerCase();
                if (productText.includes('speaker')) category = 'speakers';
                else if (productText.includes('amplifier') || productText.includes('amp')) category = 'amplifiers';
                else if (productText.includes('subwoofer') || productText.includes('sub')) category = 'subwoofers';
                else if (productText.includes('dac')) category = 'dacs';
                else if (productText.includes('streamer')) category = 'streamers';
                else if (productText.includes('processor')) category = 'processors';
                else if (productText.includes('cable') || productText.includes('wire')) category = 'cables';
                else if (productText.includes('microphone') || productText.includes('mic')) category = 'microphones';
                else if (productText.includes('mixer')) category = 'mixers';
                else if (productText.includes('turntable')) category = 'turntables';
                else if (productText.includes('headphone')) category = 'headphones';

                products.push({
                    brand,
                    model,
                    category,
                    description,
                    price: price ? parseFloat(price) : null,
                    image_url: imageUrl
                });
            });
        }

        // Store products in database
        if (products.length > 0) {
            await base44.asServiceRole.entities.AVProduct.bulkCreate(products);
        }

        return Response.json({ 
            success: true, 
            productsFound: products.length,
            products 
        });

    } catch (error) {
        console.error('Scrape error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack,
            details: 'Failed to scrape Portal.io. Please check your credentials or the site structure may have changed.'
        }, { status: 500 });
    }
});