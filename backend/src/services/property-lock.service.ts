import crypto from 'crypto';
import { redis } from '../lib/redis.js';

interface LockRecord {
  token: string;
  expiresAt: number;
}

export class PropertyLockService {
  private static LOCK_PREFIX = 'lock:property:delete:';
  private static DEFAULT_TTL_MS = 30000; // 30 seconds
  private static memoryLocks = new Map<string, LockRecord>();

  /**
   * Atomically acquire an exclusive distributed lock for property deletion.
   */
  public static async acquireLock(
    propertyId: string,
    ttlMs: number = PropertyLockService.DEFAULT_TTL_MS
  ): Promise<{ acquired: boolean; lockToken: string; reason?: string }> {
    const lockKey = `${PropertyLockService.LOCK_PREFIX}${propertyId}`;
    const lockToken = crypto.randomUUID();

    try {
      const result = await redis.set(lockKey, lockToken, 'PX', ttlMs, 'NX');
      if (result === 'OK') {
        return { acquired: true, lockToken };
      }
      const currentToken = await redis.get(lockKey);
      return {
        acquired: false,
        lockToken: '',
        reason: currentToken ? 'Deletion is actively in progress by an ongoing worker' : 'Lock contention',
      };
    } catch (err: any) {
      // In-memory fallback if Redis is not running
      const now = Date.now();
      const existing = PropertyLockService.memoryLocks.get(lockKey);
      if (existing && existing.expiresAt > now) {
        return {
          acquired: false,
          lockToken: '',
          reason: 'Deletion is actively in progress by an ongoing worker (memory lock)',
        };
      }
      PropertyLockService.memoryLocks.set(lockKey, {
        token: lockToken,
        expiresAt: now + ttlMs,
      });
      return { acquired: true, lockToken };
    }
  }

  public static async extendLock(
    propertyId: string,
    lockToken: string,
    ttlMs: number = PropertyLockService.DEFAULT_TTL_MS
  ): Promise<boolean> {
    const lockKey = `${PropertyLockService.LOCK_PREFIX}${propertyId}`;

    const extendScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    try {
      const result = await redis.eval(extendScript, 1, lockKey, lockToken, ttlMs);
      return result === 1;
    } catch (err: any) {
      const existing = PropertyLockService.memoryLocks.get(lockKey);
      if (existing && existing.token === lockToken) {
        existing.expiresAt = Date.now() + ttlMs;
        return true;
      }
      return false;
    }
  }

  public static async releaseLock(propertyId: string, lockToken: string): Promise<boolean> {
    const lockKey = `${PropertyLockService.LOCK_PREFIX}${propertyId}`;

    const releaseScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await redis.eval(releaseScript, 1, lockKey, lockToken);
      return result === 1;
    } catch (err: any) {
      const existing = PropertyLockService.memoryLocks.get(lockKey);
      if (existing && existing.token === lockToken) {
        PropertyLockService.memoryLocks.delete(lockKey);
        return true;
      }
      return false;
    }
  }

  public static async isLockActive(propertyId: string): Promise<boolean> {
    const lockKey = `${PropertyLockService.LOCK_PREFIX}${propertyId}`;
    try {
      const token = await redis.get(lockKey);
      return token !== null;
    } catch (err) {
      const existing = PropertyLockService.memoryLocks.get(lockKey);
      return Boolean(existing && existing.expiresAt > Date.now());
    }
  }
}
