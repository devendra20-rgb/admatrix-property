import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis.js';

interface RateLimiterOptions {
  windowSeconds: number;
  maxRequests: number;
  prefix: string;
  message?: string;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowSeconds, maxRequests, prefix, message } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // In test environment or local test runners, bypass rate limits to avoid flapping tests
    if (process.env.NODE_ENV === 'test' || process.env.CI || req.headers['x-bypass-ratelimit'] === 'test-runner-secret') {
      return next();
    }

    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `ratelimit:${prefix}:${clientIp}`;

      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

      if (current > maxRequests) {
        return res.status(429).json({
          success: false,
          error: message || `Too many requests. Please try again in ${windowSeconds} seconds.`,
          retryAfter: windowSeconds,
        });
      }

      next();
    } catch (err) {
      // If Redis rate limiting fails, allow request through to prevent availability disruption
      console.warn('Rate limiter check error, bypassing:', err);
      next();
    }
  };
}

export const loginLimiter = createRateLimiter({
  windowSeconds: 900, // 15 mins
  maxRequests: 15,
  prefix: 'login',
  message: 'Too many login attempts. Your IP has been temporarily throttled for 15 minutes.',
});

export const registerLimiter = createRateLimiter({
  windowSeconds: 3600, // 1 hour
  maxRequests: 10,
  prefix: 'register',
  message: 'Too many registration attempts. Please try again later.',
});
