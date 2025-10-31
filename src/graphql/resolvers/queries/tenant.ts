import { GraphQLContext } from '@/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('TENANT_QUERIES');

/**
 * Tenant Query Resolvers
 * Handles tenant-related queries
 */
export const tenantQueries = {
  /**
   * Get single tenant by ID
   */
  tenantById: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { id } = args;

      const tenant = await context.prisma.tenant.findUnique({
        where: { id },
      });

      if (!tenant || tenant.deletedAt) {
        return null;
      }

      return tenant;
    } catch (error) {
      logger.error('Error fetching tenant', error as Error);
      throw new Error('Failed to fetch tenant');
    }
  },

  /**
   * Get tenant by slug
   */
  tenantBySlug: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { slug } = args;

      const tenant = await context.prisma.tenant.findUnique({
        where: { slug },
      });

      if (!tenant || tenant.deletedAt) {
        return null;
      }

      return tenant;
    } catch (error) {
      logger.error('Error fetching tenant by slug', error as Error);
      throw new Error('Failed to fetch tenant');
    }
  },
};
