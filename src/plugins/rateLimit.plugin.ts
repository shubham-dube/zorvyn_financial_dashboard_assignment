import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { CONSTANTS } from '../config/constants.js';

async function rateLimitPlugin(fastify: FastifyInstance) {
  const options: Parameters<typeof rateLimit>[1] = {
    global: true,
    max: CONSTANTS.RATE_LIMIT.DEFAULT.max,
    // Plugin expects milliseconds for numeric windows.
    timeWindow: CONSTANTS.RATE_LIMIT.DEFAULT.window * 1000,
    skipOnError: true,
    nameSpace: 'finance-api-rl:',
    continueExceeding: true,
    enableDraftSpec: true,
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  };

  if (fastify.redis) {
    options.redis = fastify.redis;
  }

  await fastify.register(rateLimit, options);

  fastify.log.info(`✓ Rate limiting enabled (${fastify.redis ? 'redis' : 'memory'} store)`);
}

export default fp(rateLimitPlugin, {
  name: 'rate-limit',
  dependencies: ['redis'],
});
