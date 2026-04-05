import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { env } from './config/env.js';
import { errorHandler } from './lib/errors/errorHandler.js';

// Plugins
import databasePlugin from './plugins/database.plugin.js';
import redisPlugin from './plugins/redis.plugin.js';
import authPlugin from './plugins/auth.plugin.js';
import swaggerPlugin from './plugins/swagger.plugin.js';
import rateLimitPlugin from './plugins/rateLimit.plugin.js';

// Routes
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import categoriesRoutes from './modules/categories/categories.routes.js';
import recordsRoutes from './modules/financial-records/records.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';

export async function buildApp() {
  const logger =
    env.NODE_ENV === 'development'
      ? {
          level: env.LOG_LEVEL,
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        }
      : {
          level: env.LOG_LEVEL,
        };

  const app = Fastify({
    logger,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // Security plugins
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
  });

  // Core plugins
  await app.register(databasePlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);
  await app.register(rateLimitPlugin);

  // Documentation
  if (env.NODE_ENV === 'development') {
    await app.register(swaggerPlugin);
  }

  // Error handler
  app.setErrorHandler(errorHandler);

  // Health check
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Register routes
  await app.register(authRoutes, { prefix: `${env.API_PREFIX}/auth` });
  await app.register(usersRoutes, { prefix: `${env.API_PREFIX}/users` });
  await app.register(categoriesRoutes, { prefix: `${env.API_PREFIX}/categories` });
  await app.register(recordsRoutes, { prefix: `${env.API_PREFIX}/records` });
  await app.register(dashboardRoutes, { prefix: `${env.API_PREFIX}/dashboard` });
  await app.register(auditRoutes, { prefix: `${env.API_PREFIX}/audit` });

  return app;
}
