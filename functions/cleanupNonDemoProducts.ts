import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin access required' }, { status: 403 });
    }

    // Fetch all products
    const allProducts = await base44.asServiceRole.entities.AVProduct.list();
    
    // Filter out demo products
    const nonDemoProducts = allProducts.filter(p => !p.id.startsWith('demo-'));
    
    console.log(`Found ${allProducts.length} total products, ${nonDemoProducts.length} non-demo products to delete`);

    // Delete each non-demo product
    let deletedCount = 0;
    for (const product of nonDemoProducts) {
      try {
        await base44.asServiceRole.entities.AVProduct.delete(product.id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete product ${product.id}:`, error.message);
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