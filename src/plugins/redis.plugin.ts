import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { getRedisClient, closeRedisClient } from '../lib/redis/client.js';
import type Redis from 'ioredis';

async function redisPlugin(fastify: FastifyInstance) {
  const redis = getRedisClient();

  // Connect to Redis
  await redis.connect();

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    await closeRedisClient();
  });

  fastify.log.info('✓ Redis connected');
}

export default fp(redisPlugin, {
  name: 'redis',
});

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}
