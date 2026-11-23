import { Redis } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6381';

let hasLoggedWarning = false;
let isRedisAvailable = false;

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy(times) {
    if (times > 2) return null; // stop retrying if redis is not running
    return 300;
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  if (!hasLoggedWarning) {
    console.warn('Redis unavailable (falling back to memory session store):', err.message);
    hasLoggedWarning = true;
  }
  isRedisAvailable = false;
});

redis.on('connect', () => {
  console.log('Connected to Redis session store on ' + REDIS_URL);
  isRedisAvailable = true;
});

// Auto-connect once
redis.connect().catch((err) => {
  if (!hasLoggedWarning) {
    console.warn('Initial Redis connection failed (falling back to memory session store):', err.message);
    hasLoggedWarning = true;
  }
  isRedisAvailable = false;
});

// In-memory fallback session store for local development without Redis/Docker
const memorySessionStore = new Map<string, { active: boolean; createdAt: number; expiresAt: number }>();

export const SessionStore = {
  async storeRefreshToken(userId: string, tokenId: string, ttlSeconds = 7 * 86400): Promise<void> {
    const key = `session:${userId}:${tokenId}`;
    if (isRedisAvailable) {
      try {
        await redis.set(key, JSON.stringify({ active: true, createdAt: Date.now() }), 'EX', ttlSeconds);
        return;
      } catch (err) {
        // fallback to memory
      }
    }
    memorySessionStore.set(key, {
      active: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },

  async isValidRefreshToken(userId: string, tokenId: string): Promise<boolean> {
    const key = `session:${userId}:${tokenId}`;
    if (isRedisAvailable) {
      try {
        const data = await redis.get(key);
        return data !== null;
      } catch (err) {
        // fallback to memory
      }
    }
    const record = memorySessionStore.get(key);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
      memorySessionStore.delete(key);
      return false;
    }
    return record.active;
  },

  async consumeRefreshToken(userId: string, tokenId: string): Promise<boolean> {
    const key = `session:${userId}:${tokenId}`;
    if (isRedisAvailable) {
      try {
        const data = await (redis as any).getdel(key);
        return data !== null;
      } catch (err) {
        // fallback to memory
      }
    }
    const record = memorySessionStore.get(key);
    if (!record || Date.now() > record.expiresAt) {
      memorySessionStore.delete(key);
      return false;
    }
    memorySessionStore.delete(key);
    return true;
  },

  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    const key = `session:${userId}:${tokenId}`;
    if (isRedisAvailable) {
      try {
        await redis.del(key);
      } catch (err) {}
    }
    memorySessionStore.delete(key);
  },

  async revokeAllUserSessions(userId: string): Promise<void> {
    const prefix = `session:${userId}:`;
    if (isRedisAvailable) {
      try {
        const pattern = `${prefix}*`;
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (err) {}
    }
    for (const key of memorySessionStore.keys()) {
      if (key.startsWith(prefix)) {
        memorySessionStore.delete(key);
      }
    }
  },
};
