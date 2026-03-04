import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyRawBody from 'fastify-raw-body';
import { config } from './config.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import billingRoutes from './routes/billing.js';
import organizationRoutes from './routes/organizations.js';
import onboardingRoutes from './routes/onboarding.js';
import projectRoutes from './routes/projects.js';
import invitationRoutes from './routes/invitations.js';
import productRoutes from './routes/products.js';
import fileRoutes from './routes/files.js';
import wirePricingRoutes from './routes/wirePricing.js';
import exportRoutes from './routes/exports.js';

const buildServer = () => {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug'
    },
    // Base64 file uploads (JSON payloads) need more than Fastify's default 1MB.
    bodyLimit: 30 * 1024 * 1024
  });

  app.register(cors, {
    origin: (origin, cb) => {
      // Allow non-browser or same-origin server calls.
      if (!origin) return cb(null, true);
      if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    credentials: true
  });

  app.register(fastifyRawBody, {
    field: 'rawBody',
    global: true,
    encoding: 'utf8',
    runFirst: true
  });

  app.register(healthRoutes);
  app.register(authRoutes, { prefix: '/api' });
  app.register(organizationRoutes, { prefix: '/api' });
  app.register(onboardingRoutes, { prefix: '/api' });
  app.register(billingRoutes, { prefix: '/api' });
  app.register(projectRoutes, { prefix: '/api' });
  app.register(invitationRoutes, { prefix: '/api' });
  app.register(productRoutes, { prefix: '/api' });
  app.register(fileRoutes, { prefix: '/api' });
  app.register(wirePricingRoutes, { prefix: '/api' });
  app.register(exportRoutes, { prefix: '/api' });

  app.setErrorHandler((error, request, reply) => {
    if (error?.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return reply.code(413).send({ error: 'Upload too large (max ~25MB file)' });
    }
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({ error: error.message || 'Internal server error' });
  });

  return app;
};

const start = async () => {
  const app = buildServer();
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`Backend listening on http://localhost:${config.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
