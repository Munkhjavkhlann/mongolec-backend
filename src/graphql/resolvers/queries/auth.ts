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
    if (!context.user) {
      throw new Error('Not authenticated');
    }

    const user = await context.prisma.user.findUnique({
      where: { id: context.user.id },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  },

  /**
   * Get list of available tenants for registration
   */
  tenants: async (_parent: any, _args: any, context: GraphQLContext) => {
    try {
      const tenants = await context.prisma.tenant.findMany({
        where: {
          status: 'ACTIVE',
        },
        orderBy: { name: 'asc' },
      });

      return tenants;
    } catch (error) {
      logger.error('Error fetching tenants', error as Error);
      throw new Error('Failed to fetch tenants');
    }
  },
};
