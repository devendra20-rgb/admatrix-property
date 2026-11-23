import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { SessionStore } from '../lib/redis.js';

dotenv.config();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'admatrix_jwt_access_secret_2026_default_key_32chars';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'admatrix_jwt_refresh_secret_2026_default_key_32chars';

// Pre-computed dummy Argon2id hash for constant-time comparison against timing attacks
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=1$7S239y+1k6y50sZ1n996rQ$OflRskVbS4Gk0Jp5d6F1Zk4V19bNqS3641w9iH8908A';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

export interface RefreshPayload {
  userId: string;
  tokenId: string;
}

export class AuthService {
  /**
   * Hashes a password using Argon2id
   */
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Verifies a password against an Argon2id hash
   */
  static async verifyPassword(hash: string, plainText: string): Promise<boolean> {
    try {
      if (!hash) return false;
      return await argon2.verify(hash, plainText);
    } catch {
      return false;
    }
  }

  /**
   * Generates a short-lived access token (15 mins) and a long-lived refresh token (7 days)
   */
  static async generateAuthTokens(user: TokenPayload): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenId: string;
  }> {
    const tokenId = crypto.randomUUID();

    const accessToken = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
      JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.userId,
        tokenId,
      },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Save active session in Redis
    await SessionStore.storeRefreshToken(user.userId, tokenId, 7 * 86400);

    return { accessToken, refreshToken, tokenId };
  }

  /**
   * Verifies an access token
   */
  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as any;
      return {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        organizationId: decoded.organizationId,
      };
    } catch {
      return null;
    }
  }

  /**
   * Verifies a refresh token and checks Redis session store
   */
  static async verifyRefreshToken(token: string): Promise<RefreshPayload | null> {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
      if (!decoded || !decoded.userId || !decoded.tokenId) return null;

      const isValid = await SessionStore.isValidRefreshToken(decoded.userId, decoded.tokenId);
      if (!isValid) return null;

      return {
        userId: decoded.userId,
        tokenId: decoded.tokenId,
      };
    } catch {
      return null;
    }
  }

  /**
   * Performs dummy Argon2 verification to neutralize account enumeration via timing attacks
   */
  static async dummyVerify(): Promise<void> {
    try {
      await argon2.verify(DUMMY_HASH, 'dummy_timing_probe_password');
    } catch {
      // ignore
    }
  }

  /**
   * Atomically verifies and consumes a refresh token in a single Redis transaction.
   * Completely eliminates concurrency race conditions during token rotation.
   */
  static async consumeRefreshToken(token: string): Promise<RefreshPayload | null> {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
      if (!decoded || !decoded.userId || !decoded.tokenId) return null;

      const consumed = await SessionStore.consumeRefreshToken(decoded.userId, decoded.tokenId);
      if (!consumed) return null;

      return {
        userId: decoded.userId,
        tokenId: decoded.tokenId,
      };
    } catch {
      return null;
    }
  }

  /**
   * Revokes a refresh token in Redis (Token Rotation)
   */
  static async revokeSession(userId: string, tokenId: string): Promise<void> {
    await SessionStore.revokeRefreshToken(userId, tokenId);
  }
}

