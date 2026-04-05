import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

async function databasePlugin(fastify: FastifyInstance) {
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  // Test connection
  await prisma.$connect();
  fastify.log.info('✓ Database connected');
}

export default fp(databasePlugin, {
  name: 'database',
});

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
