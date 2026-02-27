import { AppError, ErrorType } from '@/types';

/**
 * Custom Error Classes for Better Error Handling
 * These provide semantic error types with consistent status codes
 */

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, ErrorType.AUTHENTICATION_ERROR, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(permission: string) {
    super(`Permission required: ${permission}`, ErrorType.AUTHORIZATION_ERROR, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, ErrorType.NOT_FOUND, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, ErrorType.VALIDATION_ERROR, 400);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, ErrorType.CONFLICT_ERROR, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, ErrorType.RATE_LIMIT_ERROR, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Helper Functions for Common Error Scenarios
 */

export const requireAuth = (context: { user?: any }): void => {
  if (!context.user) {
    throw new AuthenticationError();
  }
};

export const requirePermission = (
  context: { user?: any },
  permission: string
): void => {
  requireAuth(context);
  if (!context.user.permissions.includes(permission)) {
    throw new AuthorizationError(permission);
  }
};

export const requireRole = (context: { user?: any }, roleName: string): void => {
  requireAuth(context);
  if (!context.user.roles.includes(roleName)) {
    throw new AuthorizationError(`Role required: ${roleName}`);
  }
};

export const requireOwnerOrPermission = (
  context: { user?: any },
  resourceOwnerId: string,
  permission: string
): void => {
  requireAuth(context);

  // Check admin permission
  if (context.user.permissions.includes(permission)) {
    return;
  }

  // Check ownership
  if (context.user.id !== resourceOwnerId) {
    throw new AuthorizationError(permission);
  }
};

/**
 * Error response formatter for GraphQL
 */
export const formatGraphQLError = (error: Error): any => {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.type,
      statusCode: error.statusCode,
    };
  }

  // Unknown errors should not expose internals
  return {
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message,
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  };
};
