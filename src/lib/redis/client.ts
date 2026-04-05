import Redis from 'ioredis';
import { env } from '../../config/env.js';

let redisClient: Redis | null = null;
let redisAvailable = false;

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      redisAvailable = false;
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      redisAvailable = true;
      console.log('✓ Redis connected');
    });

    redisClient.on('end', () => {
      redisAvailable = false;
    });
  }

  return redisClient;
}

export async function initializeRedisConnection(): Promise<Redis | null> {
  const client = getRedisClient();

  try {
    await client.connect();
    redisAvailable = true;
    return client;
  } catch {
    redisAvailable = false;
    client.disconnect(false);
    return null;
  }
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    redisAvailable = false;
    await redisClient.quit();
    redisClient = null;
  }
}

export default getRedisClient;
