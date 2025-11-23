import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as cheerio from 'npm:cheerio@1.0.0-rc.12';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch the main products page
        const response = await fetch('https://www.snapav.com/shop/en/snapav');
        const html = await response.text();
        const $ = cheerio.load(html);

        const products = [];

        // Parse product listings - this selector may need adjustment based on actual site structure
        $('.product-item, .product-card, [data-product]').each((i, element) => {
            const $elem = $(element);
            
            const brand = $elem.find('.brand, .product-brand').text().trim() || 'SnapAV';
            const model = $elem.find('.model, .product-name, .product-title, h3, h4').first().text().trim();
            const price = $elem.find('.price, .product-price').first().text().replace(/[^0-9.]/g, '');
            const image = $elem.find('img').first().attr('src');
            const description = $elem.find('.description, .product-description').first().text().trim();
            
            // Try to determine category from product name or class
            let category = 'receivers';
            const productText = (model + ' ' + description).toLowerCase();
            if (productText.includes('speaker')) category = 'speakers';
            else if (productText.includes('amplifier') || productText.includes('amp')) category = 'amplifiers';
            else if (productText.includes('subwoofer') || productText.includes('sub')) category = 'subwoofers';
            else if (productText.includes('dac')) category = 'dacs';
            else if (productText.includes('streamer')) category = 'streamers';
            else if (productText.includes('processor')) category = 'processors';
            else if (productText.includes('cable')) category = 'cables';
            else if (productText.includes('microphone') || productText.includes('mic')) category = 'microphones';
            else if (productText.includes('mixer')) category = 'mixers';

            if (model) {
                products.push({
                    brand,
                    model,
                    category,
                    description,
                    price: price ? parseFloat(price) : null,
                    image_url: image ? (image.startsWith('http') ? image : `https://www.snapav.com${image}`) : null
                });
            }
        });

        // If no products found with above selectors, try alternative approach
        if (products.length === 0) {
            $('a[href*="/product/"], a[href*="/shop/"]').each((i, element) => {
                const $elem = $(element);
                const text = $elem.text().trim();
                const href = $elem.attr('href');
                
                if (text && text.length > 3 && text.length < 200) {
                    products.push({
                        brand: 'SnapAV',
                        model: text,
                        category: 'receivers',
                        description: `Product from ${href}`,
                        price: null,
                        image_url: null
                    });
                }
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
        return Response.json({ 
            error: error.message,
            details: 'Failed to scrape SnapAV website. The site structure may have changed.'
        }, { status: 500 });
    }
});