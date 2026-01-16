import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorType } from '@/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('RBAC_MIDDLEWARE');

/**
 * Permission check options
 */
interface PermissionOptions {
  resource: string;
  action: string;
  requireAll?: boolean; // If true, user must have all permissions (for arrays)
}

/**
 * Check if user has required permission
 * Permission format: "resource:action" (e.g., "content:create", "user:delete")
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(
        'Authentication required',
        ErrorType.AUTHENTICATION_ERROR,
        401
      );
    }

    const hasPermission = req.user.permissions.includes(permission);

    if (!hasPermission) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        requiredPermission: permission,
        userPermissions: req.user.permissions,
      });

      throw new AppError(
        `Permission required: ${permission}`,
        ErrorType.AUTHORIZATION_ERROR,
        403
      );
    }

    logger.debug('Permission granted', {
      userId: req.user.id,
      permission,
    });

    next();
  };
};

/**
 * Check if user has any of the required permissions
 */
export const requireAnyPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(
        'Authentication required',
        ErrorType.AUTHENTICATION_ERROR,
        401
      );
    }

    const hasPermission = permissions.some((permission) =>
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        requiredPermissions: permissions,
        userPermissions: req.user.permissions,
      });

      throw new AppError(
        `One of these permissions required: ${permissions.join(', ')}`,
        ErrorType.AUTHORIZATION_ERROR,
        403
      );
    }

    logger.debug('Permission granted', {
      userId: req.user.id,
      permissions,
    });

    next();
  };
};

/**
 * Check if user has all of the required permissions
 */
export const requireAllPermissions = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(
        'Authentication required',
        ErrorType.AUTHENTICATION_ERROR,
        401
      );
    }

    const hasAllPermissions = permissions.every((permission) =>
      req.user!.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        requiredPermissions: permissions,
        userPermissions: req.user.permissions,
      });

      throw new AppError(
        `All these permissions required: ${permissions.join(', ')}`,
        ErrorType.AUTHORIZATION_ERROR,
        403
      );
    }

    logger.debug('Permission granted', {
      userId: req.user.id,
      permissions,
    });

    next();
  };
};

/**
 * Check if user has required role
 */
export const requireRole = (roleName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(
        'Authentication required',
        ErrorType.AUTHENTICATION_ERROR,
        401
      );
    }

    const hasRole = req.user.roles.includes(roleName);

    if (!hasRole) {
      logger.warn('Role denied', {
        userId: req.user.id,
        requiredRole: roleName,
        userRoles: req.user.roles,
      });

      throw new AppError(
        `Role required: ${roleName}`,
        ErrorType.AUTHORIZATION_ERROR,
        403
      );
    }

    logger.debug('Role granted', {
      userId: req.user.id,
      role: roleName,
    });

    next();
  };
};

/**
 * Check if user has any of the required roles
 */
export const requireAnyRole = (roleNames: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(
        'Authentication required',
        ErrorType.AUTHENTICATION_ERROR,
        401
      );
    }

    const hasRole = roleNames.some((roleName) =>
      req.user!.roles.includes(roleName)
    );

    if (!hasRole) {
      logger.warn('Role denied', {
        userId: req.user.id,
        requiredRoles: roleNames,
        userRoles: req.user.roles,
      });

      throw new AppError(
        `One of these roles required: ${roleNames.join(', ')}`,
        ErrorType.AUTHORIZATION_ERROR,
        403
      );
    }

    logger.debug('Role granted', {
      userId: req.user.id,
      roles: roleNames,
    });

    next();
  };
};

/**
 * Check if user is owner of resource or has admin permission
 * Useful for update/delete operations where users can edit their own resources
 */
export const requireOwnerOrPermission = (
  getOwnerId: (req: Request) => string | Promise<string>,
  permission: string
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      throw new AppError(
        'Authentication required',
        ErrorType.AUTHENTICATION_ERROR,
        401
      );
    }

    // Check if user has admin permission
    if (req.user.permissions.includes(permission)) {
      logger.debug('Admin permission granted', {
        userId: req.user.id,
        permission,
      });
      return next();
    }

    // Check if user is owner
    const ownerId = await getOwnerId(req);
    if (req.user.id === ownerId) {
      logger.debug('Owner access granted', {
        userId: req.user.id,
        ownerId,
      });
      return next();
    }

    logger.warn('Owner or permission denied', {
      userId: req.user.id,
      ownerId,
      requiredPermission: permission,
    });

    throw new AppError(
      'You do not have permission to access this resource',
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  };
};

/**
 * Check if user belongs to same tenant as resource
 */
export const requireTenantAccess = (
  getResourceTenantId: (req: Request) => string | Promise<string>
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user || !req.tenant) {
      throw new AppError(
        'Authentication required',
        ErrorType.AUTHENTICATION_ERROR,
        401
      );
    }

    const resourceTenantId = await getResourceTenantId(req);

    if (req.user.tenantId !== resourceTenantId) {
      logger.warn('Tenant access denied', {
        userId: req.user.id,
        userTenantId: req.user.tenantId,
        resourceTenantId,
      });

      throw new AppError(
        'Resource not found in your tenant',
        ErrorType.AUTHORIZATION_ERROR,
        404
      );
    }

    logger.debug('Tenant access granted', {
      userId: req.user.id,
      tenantId: resourceTenantId,
    });

    next();
  };
};

/**
 * GraphQL authorization helper
 * Use this in GraphQL resolvers to check permissions
 */
export const checkPermission = (
  context: { user?: any },
  permission: string
): void => {
  if (!context.user) {
    throw new AppError(
      'Authentication required',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
  }

  if (!context.user.permissions.includes(permission)) {
    throw new AppError(
      `Permission required: ${permission}`,
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  }
};

/**
 * GraphQL role check helper
 */
export const checkRole = (context: { user?: any }, roleName: string): void => {
  if (!context.user) {
    throw new AppError(
      'Authentication required',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
  }

  if (!context.user.roles.includes(roleName)) {
    throw new AppError(
      `Role required: ${roleName}`,
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  }
};

/**
 * GraphQL ownership check helper
 */
export const checkOwnerOrPermission = (
  context: { user?: any },
  resourceOwnerId: string,
  permission: string
): void => {
  if (!context.user) {
    throw new AppError(
      'Authentication required',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
  }

  // Check admin permission
  if (context.user.permissions.includes(permission)) {
    return;
  }

  // Check ownership
  if (context.user.id !== resourceOwnerId) {
    throw new AppError(
      'You do not have permission to access this resource',
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  }
};
