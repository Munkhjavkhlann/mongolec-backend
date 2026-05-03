import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, ErrorType } from '@/types';
import { createLogger } from '@/utils/logger';
import { prisma } from '@/database/prisma';
import { redisClient } from '@/database/redis';

const logger = createLogger('AUTH_MIDDLEWARE');

const AUTH_CACHE_TTL = 300; // 5 minutes — must be <= JWT expiry

interface CachedAuthUser {
  id: string;
  email: string;
  tenantId: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
  tenant: {
    id: string;
    slug: string;
    name: string;
    status: string;
  };
}

function authCacheKey(userId: string): string {
  return `auth:user:${userId}`;
}

/**
 * Extend Express Request to include user and tenant
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        tenantId: string;
        roles: string[];
        permissions: string[];
      };
      tenant?: {
        id: string;
        slug: string;
        name: string;
        status: string;
      };
    }
  }
}

/**
 * JWT Payload interface
 */
interface JWTPayload {
  id: string;
  email: string;
  tenantId: string;
  iat: number;
  exp: number;
}

/**
 * Authentication middleware
 * Verifies JWT token from httpOnly cookie and attaches user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies['auth-token'];

    if (!token) {
      return next();
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Try Redis cache first — avoids DB on every request
    const cached = await redisClient.get(authCacheKey(payload.id));
    if (cached) {
      const cachedUser: CachedAuthUser = JSON.parse(cached);

      if (!cachedUser.isActive) {
        throw new AppError(
          'Your account is inactive or pending admin approval',
          ErrorType.AUTHENTICATION_ERROR,
          401
        );
      }

      if (cachedUser.tenant.status !== 'ACTIVE') {
        throw new AppError('Tenant account is suspended', ErrorType.AUTHENTICATION_ERROR, 401);
      }

      req.user = {
        id: cachedUser.id,
        email: cachedUser.email,
        tenantId: cachedUser.tenantId,
        roles: cachedUser.roles,
        permissions: cachedUser.permissions,
      };
      req.tenant = cachedUser.tenant;
      return next();
    }

    // Cache miss — hit the database
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        tenant: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      res.clearCookie('auth-token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
      });
      return next();
    }

    if (!user.isActive) {
      throw new AppError(
        'Your account is inactive or pending admin approval',
        ErrorType.AUTHENTICATION_ERROR,
        401
      );
    }

    if (user.tenant.status !== 'ACTIVE') {
      throw new AppError('Tenant account is suspended', ErrorType.AUTHENTICATION_ERROR, 401);
    }

    const roles = user.roles.map(ur => ur.role.name);
    const permissions = user.roles.flatMap(ur =>
      ur.role.permissions.map(rp => `${rp.permission.resource}:${rp.permission.action}`)
    );

    req.user = {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles,
      permissions,
    };

    req.tenant = {
      id: user.tenant.id,
      slug: user.tenant.slug,
      name: user.tenant.name,
      status: user.tenant.status,
    };

    // Write to cache fire-and-forget — a Redis failure must never break auth
    const toCache: CachedAuthUser = {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      isActive: user.isActive,
      roles,
      permissions,
      tenant: {
        id: user.tenant.id,
        slug: user.tenant.slug,
        name: user.tenant.name,
        status: user.tenant.status,
      },
    };
    redisClient
      .set(authCacheKey(user.id), JSON.stringify(toCache), AUTH_CACHE_TTL)
      .catch(err => logger.warn('Redis auth cache write failed', err));

    logger.debug('User authenticated via DB', { userId: user.id, tenantId: user.tenantId });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.clearCookie('auth-token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
      });
      logger.warn('Invalid JWT token, cleared cookie');
      return next();
    }

    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Authentication error', error as Error);
    throw new AppError('Authentication failed', ErrorType.AUTHENTICATION_ERROR, 401);
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token exists, but doesn't require it
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies['auth-token'];

    if (!token) {
      return next();
    }

    // Verify and attach user (same logic as authenticate)
    await authenticate(req, res, next);
  } catch (error) {
    // On error, just continue without user
    logger.warn('Optional authentication failed', error as Error);
    next();
  }
};

/**
 * Require authentication middleware
 * Throws error if user is not authenticated
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new AppError('Authentication required', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  next();
};
