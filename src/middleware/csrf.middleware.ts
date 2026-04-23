import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorType } from '@/types';
import { createLogger } from '@/utils/logger';
import { redisClient } from '@/database/redis';
import crypto from 'crypto';

const logger = createLogger('CSRF');

/**
 * CSRF Configuration
 */
interface CSRFConfig {
  tokenLength: number;
  tokenExpiry: number; // in seconds
  cookieName: string;
  headerName: string;
}

const defaultConfig: CSRFConfig = {
  tokenLength: 32,
  tokenExpiry: 3600, // 1 hour
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
};

/**
 * Generate CSRF token
 */
const generateCSRFToken = (): string => {
  return crypto.randomBytes(defaultConfig.tokenLength).toString('hex');
};

/**
 * Generate CSRF token and store in Redis/cookie
 */
export const generateCSRF = async (
  req: Request,
  res: Response,
  next?: NextFunction
): Promise<string> => {
  const token = generateCSRFToken();
  const key = `csrf:${req.user?.id || req.ip}`;

  try {
    // Store token in Redis
    if (redisClient.isHealthy()) {
      const redis = redisClient.getClient();
      await redis.setex(key, defaultConfig.tokenExpiry, token);
    }

    // Set token in cookie (double-submit cookie pattern)
    res.cookie(defaultConfig.cookieName, token, {
      httpOnly: false, // Must be readable by JavaScript for double-submit
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: defaultConfig.tokenExpiry * 1000,
      path: '/',
    });

    logger.debug('CSRF token generated', {
      userId: req.user?.id || 'anonymous',
      ip: req.ip,
    });

    if (next) {
      next();
    }

    return token;
  } catch (error) {
    logger.error('CSRF token generation error', error as Error);
    throw new AppError(
      'Failed to generate CSRF token',
      ErrorType.INTERNAL_ERROR,
      500
    );
  }
};

/**
 * Verify CSRF token
 */
const verifyCSRFToken = async (req: Request): Promise<boolean> => {
  const key = `csrf:${req.user?.id || req.ip}`;

  // Get token from header
  const headerToken = req.headers[defaultConfig.headerName] as string;

  // Get token from cookie
  const cookieToken = req.cookies[defaultConfig.cookieName];

  if (!headerToken || !cookieToken) {
    logger.warn('CSRF token missing', {
      userId: req.user?.id || 'anonymous',
      ip: req.ip,
      hasHeaderToken: !!headerToken,
      hasCookieToken: !!cookieToken,
    });
    return false;
  }

  // Tokens must match
  if (headerToken !== cookieToken) {
    logger.warn('CSRF token mismatch', {
      userId: req.user?.id || 'anonymous',
      ip: req.ip,
    });
    return false;
  }

  // Verify against Redis if available
  if (redisClient.isHealthy()) {
    try {
      const redis = redisClient.getClient();
      const storedToken = await redis.get(key);

      if (storedToken !== headerToken) {
        logger.warn('CSRF token invalid (Redis mismatch)', {
          userId: req.user?.id || 'anonymous',
          ip: req.ip,
        });
        return false;
      }
    } catch (error) {
      logger.error('CSRF verification error', error as Error);
      return false;
    }
  }

  return true;
};

/**
 * CSRF protection middleware
 * Validates CSRF token for state-changing requests
 */
export const csrfProtection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
  // Skip CSRF for GET, HEAD, OPTIONS (safe methods)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    // Generate CSRF token for safe methods
    await generateCSRF(req, res);
    return next();
  }

  // For state-changing methods, verify CSRF token
  const isValid = await verifyCSRFToken(req);

  if (!isValid) {
    logger.warn('CSRF validation failed', {
      method: req.method,
      path: req.path,
      userId: req.user?.id || 'anonymous',
      ip: req.ip,
    });

    return next(new AppError(
      'Invalid CSRF token. Refresh the page and try again.',
      ErrorType.VALIDATION_ERROR,
      403,
      true,
      {
        type: 'CSRF_ERROR',
      }
    ));
  }

  logger.debug('CSRF validation passed', {
    method: req.method,
    path: req.path,
    userId: req.user?.id || 'anonymous',
  });

  next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional CSRF protection
 * Generates token but doesn't enforce validation
 * Useful for APIs that might be called from various clients
 */
export const optionalCSRF = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await generateCSRF(req, res);
  } catch (error) {
    logger.warn('Optional CSRF generation failed', error as Error);
  }

  next();
};

/**
 * Refresh CSRF token
 */
export const refreshCSRF = async (
  req: Request,
  res: Response
): Promise<{ token: string }> => {
  const token = await generateCSRF(req, res);

  return {
    token,
  };
};

/**
 * Invalidate CSRF token (logout)
 */
export const invalidateCSRF = async (req: Request): Promise<void> => {
  const key = `csrf:${req.user?.id || req.ip}`;

  if (redisClient.isHealthy()) {
    try {
      const redis = redisClient.getClient();
      await redis.del(key);

      logger.info('CSRF token invalidated', {
        userId: req.user?.id || 'anonymous',
        ip: req.ip,
      });
    } catch (error) {
      logger.error('CSRF invalidation error', error as Error);
    }
  }

  // Clear cookie
  req.res?.clearCookie(defaultConfig.cookieName, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
};

/**
 * GraphQL CSRF protection
 * Add this to your GraphQL context to protect mutations
 */
export const graphqlCSRFProtection = (
  req: Request,
  res: Response
): void => {
  // Check if operation is a mutation
  const isMutation = req.body?.operationName === 'mutation' ||
                     req.body?.query?.trim().startsWith('mutation');

  if (isMutation) {
    const isValid = verifyCSRFToken(req);

    if (!isValid) {
      throw new AppError(
        'Invalid CSRF token for mutation',
        ErrorType.VALIDATION_ERROR,
        403
      );
    }
  }
};

/**
 * Get current CSRF token (for testing/debugging)
 */
export const getCSRFToken = (req: Request): string | undefined => {
  return req.cookies[defaultConfig.cookieName];
};
