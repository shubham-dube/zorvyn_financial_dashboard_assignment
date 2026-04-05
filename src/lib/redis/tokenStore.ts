import { getRedisClient } from './client.js';
import { CONSTANTS } from '../../config/constants.js';
import { randomBytes } from 'crypto';

export class TokenStore {
  private redis = getRedisClient();

  async storeRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const key = `${CONSTANTS.REFRESH_TOKEN_PREFIX}:${token}`;

    await this.redis.setex(key, CONSTANTS.JWT.REFRESH_TOKEN_EXPIRES_IN_SECONDS, userId);

    return token;
  }

  async getUserIdFromRefreshToken(token: string): Promise<string | null> {
    const key = `${CONSTANTS.REFRESH_TOKEN_PREFIX}:${token}`;
    return await this.redis.get(key);
  }

  async deleteRefreshToken(token: string): Promise<void> {
    const key = `${CONSTANTS.REFRESH_TOKEN_PREFIX}:${token}`;
    await this.redis.del(key);
  }

  async blockAccessToken(jti: string, expiresIn: number): Promise<void> {
    const key = `${CONSTANTS.BLOCKLIST_PREFIX}:${jti}`;
    await this.redis.setex(key, expiresIn, '1');
  }

  async isAccessTokenBlocked(jti: string): Promise<boolean> {
    const key = `${CONSTANTS.BLOCKLIST_PREFIX}:${jti}`;
    const result = await this.redis.get(key);
    return result !== null;
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const pattern = `${CONSTANTS.REFRESH_TOKEN_PREFIX}:*`;
    const stream = this.redis.scanStream({ match: pattern, count: 100 });

    const tokensToDelete: string[] = [];

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
  }
}

export const tokenStore = new TokenStore();
