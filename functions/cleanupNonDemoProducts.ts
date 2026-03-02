import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin access required' }, { status: 403 });
    }

    // Fetch all products with pagination to handle large datasets
    const allProducts = await base44.asServiceRole.entities.AVProduct.list();
    
    // Filter out demo products
    const nonDemoProducts = allProducts.filter(p => !p.id.startsWith('demo-'));
    
    console.log(`Found ${allProducts.length} total products, ${nonDemoProducts.length} non-demo products to delete`);

    // Delete with batching and rate limit handling
    let deletedCount = 0;
    const batchSize = 5;
    for (let i = 0; i < nonDemoProducts.length; i += batchSize) {
      const batch = nonDemoProducts.slice(i, i + batchSize);
      
      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map(product => 
          base44.asServiceRole.entities.AVProduct.delete(product.id)
        )
      );
      
      // Count successful deletions
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          deletedCount++;
        } else {
          console.error(`Failed to delete product ${batch[idx].id}:`, result.reason?.message || result.reason);
        }
      });
      
      // Wait between batches to avoid rate limits
      if (i + batchSize < nonDemoProducts.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const demoProducts = allProducts.filter(p => p.id.startsWith('demo-'));

    return Response.json({
      success: true,
      deleted: deletedCount,
      demoProductsRemaining: demoProducts.length,
      message: `Deleted ${deletedCount} products. Kept ${demoProducts.length} demo products.`
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});