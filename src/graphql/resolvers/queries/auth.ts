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
  me: async (_parent: any, _args: any, context: GraphQLContext) => {
    // Return null if not authenticated (don't throw error)
    if (!context.user) {
      return null;
    }

    const user = await context.prisma.user.findUnique({
      where: { id: context.user.id },
      include: {
        tenant: true,
      },
    });

    return user;
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
