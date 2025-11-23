import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use LLM with web search to get current AV products
        const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Find 30 popular professional AV (audio/visual) products across these categories: speakers, amplifiers, receivers, subwoofers, turntables, dacs, streamers, headphones, processors, cables, microphones, and mixers. 

Include products from brands like: Yamaha, Denon, Marantz, McIntosh, KEF, Bowers & Wilkins, Sonos, Cambridge Audio, NAD, Klipsch, SVS, Pro-Ject, Schiit, AudioQuest, Shure, Behringer, and other popular AV brands.

For each product, provide accurate current information including brand, model number, category, description, approximate price in USD, and any available product image URLs.

Return a diverse mix across all categories.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    products: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                brand: { type: "string" },
                                model: { type: "string" },
                                category: { 
                                    type: "string",
                                    enum: ["speakers", "amplifiers", "receivers", "subwoofers", "turntables", "dacs", "streamers", "headphones", "processors", "cables", "microphones", "mixers"]
                                },
                                description: { type: "string" },
                                price: { type: "number" },
                                image_url: { type: "string" }
                            },
                            required: ["brand", "model", "category"]
                        }
                    }
                },
                required: ["products"]
            }
        });

        const products = response.products || [];

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