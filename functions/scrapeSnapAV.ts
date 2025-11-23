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
            prompt: `Find 40 popular professional AV (audio/visual) products across these specific categories:
- Televisions (4K, 8K, OLED, QLED TVs)
- Projectors (home theater, business projectors)
- Projector Screens (fixed, motorized screens)
- Video Distribution (HDMI splitters, extenders)
- Matrix switchers (HDMI matrix switches)
- Audio Streamers (network audio streamers)
- Media Streamers (streaming devices, media players)
- Speakers (bookshelf, floor-standing, in-wall, outdoor)
- Soundbars (TV soundbars)
- Subwoofers (powered subwoofers)
- Stereo Amps (2-channel amplifiers)
- Multi-Zone Amps (multi-room amplifiers)
- Surround Processors (AV processors, pre-amps)
- AV Receivers (home theater receivers)

Include products from brands like: Sony, LG, Samsung, Epson, BenQ, Screen Innovations, Elite Screens, Denon, Yamaha, Marantz, Anthem, Sonos, KEF, Bowers & Wilkins, Klipsch, SVS, McIntosh, NAD, Cambridge Audio, Rotel, and other popular AV brands.

For each product, provide accurate current information including brand, model number, the exact category name from the list above, description, approximate price in USD, and any available product image URLs.

Return a diverse mix across all categories with at least 2-3 products per category.`,
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
                                    enum: ["Televisions", "Projectors", "Projector Screens", "Video Distribution", "Matrix switchers", "Audio Streamers", "Media Streamers", "Speakers", "Soundbars", "Subwoofers", "Stereo Amps", "Multi-Zone Amps", "Surround Processors", "AV Receivers"]
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