import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthService } from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { loginLimiter, registerLimiter } from '../middleware/rate-limiter.middleware.js';

export const authRouter = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

// POST /api/auth/register
authRouter.post('/register', registerLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, organizationName, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and full name are required.',
      });
    }

    // SECURITY RULE: Never allow public SUPER_ADMIN registration
    if (role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: SUPER_ADMIN accounts cannot be registered publicly.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'A user account with this email address already exists.',
      });
    }

    const passwordHash = await AuthService.hashPassword(password);

    // Create or locate organization
    let organization;
    if (organizationName && organizationName.trim()) {
      organization = await prisma.organization.create({
        data: {
          name: organizationName.trim(),
          phone: phone || null,
          email: email.toLowerCase().trim(),
        },
      });
    } else {
      // Fallback to first existing organization or create default
      organization = await prisma.organization.findFirst();
      if (!organization) {
        organization = await prisma.organization.create({
          data: {
            name: `${name}'s Brokerage`,
            email: email.toLowerCase().trim(),
          },
        });
      }
    }

    const userRole = role === 'AGENT' ? 'AGENT' : (organizationName ? 'BROKERAGE_ADMIN' : 'BROKER');

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name.trim(),
        phone: phone || null,
        role: userRole,
        organizationId: organization.id,
      },
      include: {
        organization: true,
      },
    });

    const tokens = await AuthService.generateAuthTokens({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      organizationId: newUser.organizationId,
    });

    res.cookie('accessToken', tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        organizationId: newUser.organizationId,
        organization: newUser.organization,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed: ' + String(error) });
  }
});

// POST /api/auth/login
authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { organization: true },
    });

    if (!user) {
      // Neutralize account enumeration timing attacks with dummy Argon2id verification
      await AuthService.dummyVerify();
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password credentials.',
      });
    }

    const isMatch = await AuthService.verifyPassword(user.passwordHash, password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password credentials.',
      });
    }

    const tokens = await AuthService.generateAuthTokens({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    });

    res.cookie('accessToken', tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organization: user.organization,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed: ' + String(error) });
  }
});

// POST /api/auth/refresh (Atomic Concurrency-Safe Rotation)
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token is required.',
      });
    }

    // Atomically verify and consume the old refresh token (Redis GETDEL)
    // Eliminates race conditions if concurrent requests hit with the same token
    const payload = await AuthService.consumeRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid, revoked, or expired refresh token. Please re-login.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { organization: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found.' });
    }

    // Generate new tokens
    const newTokens = await AuthService.generateAuthTokens({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    });

    res.cookie('accessToken', newTokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newTokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Tokens rotated successfully.',
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ success: false, error: 'Token refresh failed.' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (refreshToken) {
      const payload = await AuthService.verifyRefreshToken(refreshToken);
      if (payload) {
        await AuthService.revokeSession(payload.userId, payload.tokenId);
      }
    }

    res.clearCookie('accessToken', COOKIE_OPTIONS);
    res.clearCookie('refreshToken', COOKIE_OPTIONS);

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Logout failed.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { organization: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organization: user.organization,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user profile.' });
  }
});

