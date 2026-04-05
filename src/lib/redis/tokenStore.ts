import { getRedisClient, isRedisAvailable } from './client.js';
import { CONSTANTS } from '../../config/constants.js';
import { randomBytes } from 'crypto';

interface LocalRefreshTokenEntry {
  userId: string;
  expiresAt: number;
}

export class TokenStore {
  private redis = getRedisClient();
  private localRefreshTokens = new Map<string, LocalRefreshTokenEntry>();
  private localBlockedTokens = new Map<string, number>();

  private pruneLocalState(): void {
    const now = Date.now();

    for (const [token, entry] of this.localRefreshTokens.entries()) {
      if (entry.expiresAt <= now) {
        this.localRefreshTokens.delete(token);
      }
    }

    for (const [jti, expiresAt] of this.localBlockedTokens.entries()) {
      if (expiresAt <= now) {
        this.localBlockedTokens.delete(jti);
      }
    }
  }

  async storeRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const key = `${CONSTANTS.REFRESH_TOKEN_PREFIX}:${token}`;
    const ttl = CONSTANTS.JWT.REFRESH_TOKEN_EXPIRES_IN_SECONDS;

    this.pruneLocalState();

    if (isRedisAvailable()) {
      try {
        await this.redis.setex(key, ttl, userId);
        return token;
      } catch {
        // Fall through to local in-memory fallback.
      }
    }

    this.localRefreshTokens.set(token, {
      userId,
      expiresAt: Date.now() + ttl * 1000,
    });

    return token;
  }

  async getUserIdFromRefreshToken(token: string): Promise<string | null> {
    const key = `${CONSTANTS.REFRESH_TOKEN_PREFIX}:${token}`;

    this.pruneLocalState();

    if (isRedisAvailable()) {
      try {
        return await this.redis.get(key);
      } catch {
        // Fall through to local in-memory fallback.
      }
    }

    return this.localRefreshTokens.get(token)?.userId ?? null;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    const key = `${CONSTANTS.REFRESH_TOKEN_PREFIX}:${token}`;

    this.localRefreshTokens.delete(token);

    if (isRedisAvailable()) {
      try {
        await this.redis.del(key);
      } catch {
        // Ignore and keep local fallback behavior.
      }
    }
  }

  async blockAccessToken(jti: string, expiresIn: number): Promise<void> {
    const key = `${CONSTANTS.BLOCKLIST_PREFIX}:${jti}`;

    this.pruneLocalState();
    this.localBlockedTokens.set(jti, Date.now() + expiresIn * 1000);

    if (isRedisAvailable()) {
      try {
        await this.redis.setex(key, expiresIn, '1');
      } catch {
        // Ignore and keep local fallback behavior.
      }
    }
  }

  async isAccessTokenBlocked(jti: string): Promise<boolean> {
    const key = `${CONSTANTS.BLOCKLIST_PREFIX}:${jti}`;

    this.pruneLocalState();

    if (isRedisAvailable()) {
      try {
        const result = await this.redis.get(key);
        if (result !== null) {
          return true;
        }
      } catch {
        // Ignore and keep local fallback behavior.
      }
    }

    const expiresAt = this.localBlockedTokens.get(jti);
    return typeof expiresAt === 'number' && expiresAt > Date.now();
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    this.pruneLocalState();

    for (const [token, entry] of this.localRefreshTokens.entries()) {
      if (entry.userId === userId) {
        this.localRefreshTokens.delete(token);
      }
    }

    if (!isRedisAvailable()) {
      return;
    }

    const pattern = `${CONSTANTS.REFRESH_TOKEN_PREFIX}:*`;
    const stream = this.redis.scanStream({ match: pattern, count: 100 });

    const tokensToDelete: string[] = [];

    try {
      for await (const keys of stream) {
        for (const key of keys) {
          const storedUserId = await this.redis.get(key);
          if (storedUserId === userId) {
            tokensToDelete.push(key);
          }
        }
      }

      if (tokensToDelete.length > 0) {
        await this.redis.del(...tokensToDelete);
      }
    } catch {
      // Ignore and keep local fallback behavior.
    }
  }
}

export const tokenStore = new TokenStore();
