import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { initializeRedisConnection, closeRedisClient } from '../lib/redis/client.js';
import type Redis from 'ioredis';

async function redisPlugin(fastify: FastifyInstance) {
  const redis = await initializeRedisConnection();

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    await closeRedisClient();
  });

  if (redis) {
    fastify.log.info('✓ Redis connected');
  } else {
    fastify.log.warn('⚠ Redis unavailable, continuing in degraded mode');
  }
}

export default fp(redisPlugin, {
  name: 'redis',
});

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis | null;
  }
}
