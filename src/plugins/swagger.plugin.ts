import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from '../config/env.js';

async function swaggerPlugin(fastify: FastifyInstance) {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Finance Dashboard API',
        description: 'Production-grade Finance Data Processing and Access Control API',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Users', description: 'User management endpoints' },
        { name: 'Categories', description: 'Category management endpoints' },
        { name: 'Financial Records', description: 'Financial record endpoints' },
        { name: 'Dashboard', description: 'Dashboard analytics endpoints' },
        { name: 'Audit', description: 'Audit log endpoints' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });

  fastify.log.info('✓ Swagger documentation available at /documentation');
}

export default fp(swaggerPlugin, {
  name: 'swagger',
});
