import { GraphQLContext } from '@/types';
import { requireAuth, requirePermission, requireRole, requireOwnerOrPermission } from '@/utils/errors';

/**
 * Higher-order function for authentication
 * Wraps resolver functions to ensure user is authenticated
 */
export function authenticated<T extends (...args: any[]) => any>(
  fn: T
): T {
  return (async (...args: any[]) => {
    const context = args[2] as GraphQLContext;
    requireAuth(context);
    return fn(...args);
  }) as T;
}

/**
 * Higher-order function for authorization
 * Wraps resolver functions to ensure user has required permission
 */
export function withPermission(permission: string) {
  return <T extends (...args: any[]) => any>(fn: T): T => {
    return (async (...args: any[]) => {
      const context = args[2] as GraphQLContext;
      requirePermission(context, permission);
      return fn(...args);
    }) as T;
  };
}

/**
 * Higher-order function for role-based authorization
 * Wraps resolver functions to ensure user has required role
 */
export function withRole(roleName: string) {
  return <T extends (...args: any[]) => any>(fn: T): T => {
    return (async (...args: any[]) => {
      const context = args[2] as GraphQLContext;
      requireRole(context, roleName);
      return fn(...args);
    }) as T;
  };
}

/**
 * Higher-order function for ownership or permission check
 * Wraps resolver functions to allow resource owner or admin
 */
export function withOwnerOrPermission(getResourceOwnerId: (...args: any[]) => string, permission: string) {
  return <T extends (...args: any[]) => any>(fn: T): T => {
    return (async (...args: any[]) => {
      const context = args[2] as GraphQLContext;
      const resourceOwnerId = getResourceOwnerId(...args);
      requireOwnerOrPermission(context, resourceOwnerId, permission);
      return fn(...args);
    }) as T;
  };
}

/**
 * Compose multiple decorators
 * Usage: compose(authenticated(), withPermission('user:manage'))(resolver)
 */
export function compose<T extends (...args: any[]) => any>(
  ...decorators: Array<(fn: T) => T>
): (fn: T) => T {
  return (fn: T): T => {
    return decorators.reduceRight((acc, decorator) => decorator(acc), fn);
  };
}
