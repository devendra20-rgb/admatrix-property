import { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from '../services/auth.service.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      organizationId?: string;
    }
  }
}

/**
 * Validates JWT access token from HTTP-only cookie or Authorization header
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined = req.cookies?.accessToken;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. No access token provided.',
    });
  }

  const payload = AuthService.verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired access token. Please re-authenticate.',
    });
  }

  req.user = payload;
  req.organizationId = payload.organizationId;
  next();
}

/**
 * Role-Based Access Control (RBAC) middleware
 * Allowed roles: SUPER_ADMIN, BROKERAGE_ADMIN, BROKER, AGENT
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next(); // Super Admin bypasses role restrictions
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access forbidden: Requires one of [${allowedRoles.join(', ')}] role. Current role: ${req.user.role}`,
      });
    }

    next();
  };
}

/**
 * Enforces organization-level data isolation
 */
export function tenantGuard(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (req.user.role !== 'SUPER_ADMIN' && !req.user.organizationId) {
    return res.status(403).json({
      success: false,
      error: 'Tenant context missing. User is not assigned to an active Organization.',
    });
  }

  req.organizationId = req.user.organizationId;
  next();
}

