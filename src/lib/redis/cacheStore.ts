import { getRedisClient, isRedisAvailable } from './client.js';

interface LocalCacheEntry {
  value: string;
  expiresAt: number;
}

export class CacheStore {
  private redis = getRedisClient();
  private localCache = new Map<string, LocalCacheEntry>();

  private pruneLocalCache(): void {
    const now = Date.now();

    for (const [key, entry] of this.localCache.entries()) {
      if (entry.expiresAt <= now) {
        this.localCache.delete(key);
      }
    }
  }

  private patternToRegExp(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  }

  async get<T>(key: string): Promise<T | null> {
    this.pruneLocalCache();

    if (isRedisAvailable()) {
      try {
        const data = await this.redis.get(key);
        if (data) {
          return JSON.parse(data) as T;
        }
      } catch {
        // Fall through to local in-memory fallback.
      }
    }

    const entry = this.localCache.get(key);
    if (!entry) {
      return null;
    }

    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    this.pruneLocalCache();

    const serializedValue = JSON.stringify(value);
    this.localCache.set(key, {
      value: serializedValue,
      expiresAt: Date.now() + ttl * 1000,
    });

    if (isRedisAvailable()) {
      try {
        await this.redis.setex(key, ttl, serializedValue);
      } catch {
        // Ignore and keep local fallback behavior.
      }
    }
  }

  async del(key: string): Promise<void> {
    this.localCache.delete(key);

    if (isRedisAvailable()) {
      try {
        await this.redis.del(key);
      } catch {
        // Ignore and keep local fallback behavior.
      }
    }
  }

  async delPattern(pattern: string): Promise<void> {
    this.pruneLocalCache();

    const matcher = this.patternToRegExp(pattern);
    for (const key of this.localCache.keys()) {
      if (matcher.test(key)) {
        this.localCache.delete(key);
      }
    }

    if (!isRedisAvailable()) {
      return;
    }

    const stream = this.redis.scanStream({ match: pattern, count: 100 });
    const keysToDelete: string[] = [];

    try {
      for await (const keys of stream) {
        keysToDelete.push(...keys);
      }

      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
      }
    } catch {
      // Ignore and keep local fallback behavior.
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
