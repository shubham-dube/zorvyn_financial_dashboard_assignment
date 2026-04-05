import { getRedisClient } from './client.js';

export class CacheStore {
  private redis = getRedisClient();

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const stream = this.redis.scanStream({ match: pattern, count: 100 });
    const keysToDelete: string[] = [];

    for await (const keys of stream) {
      keysToDelete.push(...keys);
    }

    if (keysToDelete.length > 0) {
      await this.redis.del(...keysToDelete);
    }
  }

  async invalidateDashboardCache(userId?: string): Promise<void> {
    const targetUser = userId ?? '*';
    const patterns = [
      `dashboard:summary:${targetUser}:*`,
      `dashboard:trends:${targetUser}:*`,
      `dashboard:categories:${targetUser}:*`,
      `dashboard:recent:${targetUser}:*`,
      `dashboard:insights:${targetUser}`,
    ];

    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }
}

export const cacheStore = new CacheStore();
