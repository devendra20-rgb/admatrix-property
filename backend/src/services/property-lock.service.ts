import crypto from 'crypto';
import { redis } from '../lib/redis.js';

export class PropertyLockService {
  private static LOCK_PREFIX = 'lock:property:delete:';
  private static DEFAULT_TTL_MS = 30000; // 30 seconds

  /**
   * Atomically acquire an exclusive distributed lock for property deletion.
   * Uses Redis SET NX PX to guarantee mutual exclusion across concurrent processes.
   */
  public static async acquireLock(
    propertyId: string,
    ttlMs: number = PropertyLockService.DEFAULT_TTL_MS
  ): Promise<{ acquired: boolean; lockToken: string; reason?: string }> {
    const lockKey = `${PropertyLockService.LOCK_PREFIX}${propertyId}`;
    const lockToken = crypto.randomUUID();

    try {
      // SET key value PX ttl NX: Atomically sets if Not eXists with millisecond expiry
      const result = await redis.set(lockKey, lockToken, 'PX', ttlMs, 'NX');

      if (result === 'OK') {
        return { acquired: true, lockToken };
      }

      // Lock is already held by an active deletion process
      const currentToken = await redis.get(lockKey);
      return {
        acquired: false,
        lockToken: '',
        reason: currentToken ? 'Deletion is actively in progress by an ongoing worker' : 'Lock contention',
      };
    } catch (err: any) {
      console.error(`[PropertyLockService] FAIL-CLOSED: Redis error acquiring lock for ${propertyId}:`, err.message);
      // Strictly fail-closed: Never allow deletion if Redis lock store is unavailable
      return {
        acquired: false,
        lockToken: '',
        reason: `Lock acquisition failed: Redis is unavailable (${err.message}). Deletion blocked by fail-closed policy.`,
      };
    }
  }

  /**
   * Refresh lock heartbeat to guarantee a slow but active deletion never has its lock reclaimed.
   * Can only extend if the current lock token matches the owner.
   */
  public static async extendLock(
    propertyId: string,
    lockToken: string,
    ttlMs: number = PropertyLockService.DEFAULT_TTL_MS
  ): Promise<boolean> {
    const lockKey = `${PropertyLockService.LOCK_PREFIX}${propertyId}`;

    // Lua script: Only extend TTL if the caller owns the lock
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
      console.error(`[PropertyLockService] FAIL-CLOSED: Redis error extending lock for ${propertyId}:`, err.message);
      // Strictly fail-closed: Do not claim lock was extended if Redis is unreachable
      return false;
    }
  }

  /**
   * Safely release lock using atomic ownership check via Lua script.
   * Prevents a process from releasing a lock that expired and was re-acquired by another process.
   */
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
      console.warn(`[PropertyLockService] Redis error releasing lock for ${propertyId}:`, err.message);
      return false;
    }
  }

  /**
   * Check if a property is currently locked in Redis by an active deletion process.
   */
  public static async isLockActive(propertyId: string): Promise<boolean> {
    const lockKey = `${PropertyLockService.LOCK_PREFIX}${propertyId}`;
    try {
      const token = await redis.get(lockKey);
      return token !== null;
    } catch (err) {
      return false;
    }
  }
}

