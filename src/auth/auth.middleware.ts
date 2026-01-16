import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, ErrorType } from '@/types';
import { createLogger } from '@/utils/logger';
import { prisma } from '@/database/prisma';

const logger = createLogger('AUTH_MIDDLEWARE');

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
    // Extract token from httpOnly cookie
    const token = req.cookies['auth-token'];

    if (!token) {
      // No token - user is not authenticated, but don't throw error
      // GraphQL resolvers will check for req.user
      return next();
    }

    // Verify JWT token
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Get user from database with roles and permissions
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
      // User not found (might be deleted) - clear cookie
      res.clearCookie('auth-token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
      });
      return next();
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError(
        'User account is inactive',
        ErrorType.AUTHENTICATION_ERROR,
        401
      );
    }

    // Check if tenant is active
    if (user.tenant.status !== 'ACTIVE') {
      throw new AppError(
        'Tenant account is suspended',
        ErrorType.AUTHENTICATION_ERROR,
        401
      );
    }

    // Extract roles and permissions
    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = user.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`)
    );

    // Attach user and tenant to request
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

    logger.debug('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles,
    });

    next();
  } catch (error) {
    // JWT verification failed - clear cookie
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
    throw new AppError(
      'Authentication failed',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
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
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new AppError(
      'Authentication required',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
  }
  next();
};
