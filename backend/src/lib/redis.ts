import { Redis } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6381';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.warn('Redis connection warning:', err.message);
});

redis.on('connect', () => {
  console.log('Connected to Redis session store on ' + REDIS_URL);
});

// Auto-connect
redis.connect().catch((err) => {
  console.warn('Initial Redis connection failed, continuing:', err.message);
});

export const SessionStore = {
  async storeRefreshToken(userId: string, tokenId: string, ttlSeconds = 7 * 86400): Promise<void> {
    try {
      const key = `session:${userId}:${tokenId}`;
      await redis.set(key, JSON.stringify({ active: true, createdAt: Date.now() }), 'EX', ttlSeconds);
    } catch (err) {
      console.error('SessionStore.storeRefreshToken error:', err);
      throw err;
    }
  },

  async isValidRefreshToken(userId: string, tokenId: string): Promise<boolean> {
    try {
      const key = `session:${userId}:${tokenId}`;
      const data = await redis.get(key);
      return data !== null;
    } catch (err) {
      console.error('SessionStore.isValidRefreshToken error:', err);
      // Zero-Trust Fail Closed: Never allow token validation if session store is unreachable
      return false;
    }
  },

  /**
   * Atomically checks and revokes a refresh token in a single Redis operation (GETDEL).
   * Prevents race conditions during concurrent rotation requests.
   */
  async consumeRefreshToken(userId: string, tokenId: string): Promise<boolean> {
    try {
      const key = `session:${userId}:${tokenId}`;
      // In Redis 6.2+, GETDEL atomically returns and deletes the key
      const data = await (redis as any).getdel(key);
      return data !== null;
    } catch (err) {
      console.error('SessionStore.consumeRefreshToken error:', err);
      return false;
    }
  },

  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    try {
      const key = `session:${userId}:${tokenId}`;
      await redis.del(key);
    } catch (err) {
      console.error('SessionStore.revokeRefreshToken error:', err);
    }
  },

  async revokeAllUserSessions(userId: string): Promise<void> {
    try {
      const pattern = `session:${userId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      console.error('SessionStore.revokeAllUserSessions error:', err);
    }
  },
};

