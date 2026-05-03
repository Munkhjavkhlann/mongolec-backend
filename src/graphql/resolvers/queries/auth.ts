import { GraphQLContext } from '@/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AUTH_QUERIES');

/**
 * Auth Query Resolvers
 * Handles user authentication queries
 */
export const authQueries = {
  /**
   * Get current authenticated user
   */
  me: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
    if (!context.user) return null;

    // Middleware already resolved the user, tenant & roles — no extra DB round-trip needed
    const user = await context.prisma.user.findUnique({
      where: { id: context.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return null;

    // Attach tenant and roles from middleware context (already fetched/cached, no extra DB query)
    const roles = (context.user.roles ?? []).map((name: string) => ({
      id: name,
      role: { id: name, name },
    }));

    return { ...user, tenant: context.tenant, roles };
  },

  /**
   * Get list of available tenants for registration
   */
  tenants: async (_parent: any, _args: any, context: GraphQLContext) => {
    try {
      const tenants = await context.prisma.tenant.findMany({
        where: {
          deletedAt: null, // Only active tenants (not soft-deleted)
        },
        orderBy: { createdAt: 'desc' },
      });

      return tenants;
    } catch (error) {
      logger.error('Error fetching tenants', error as Error);
      throw new Error('Failed to fetch tenants');
    }
  },
};
