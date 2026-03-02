export default async function healthRoutes(fastify) {
  fastify.get('/', async () => {
    return {
      service: 'avsystemdesign-backend',
      status: 'ok',
      docs: ['/health', '/api/me', '/api/bootstrap', '/api/billing/subscription', '/api/projects', '/api/products', '/api/products/seed-demo', '/api/products/import', '/api/wire-pricing', '/api/files/upload']
    };
  });

  fastify.get('/health', async () => {
    return {
      status: 'ok',
      service: 'avsystemdesign-backend',
      timestamp: new Date().toISOString()
    };
  });
}
