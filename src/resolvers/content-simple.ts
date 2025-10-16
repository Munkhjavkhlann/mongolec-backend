import { GraphQLContext } from '@/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CONTENT_RESOLVER_SIMPLE');

/**
 * Simplified content resolvers for basic functionality
 */
export const contentResolvers = {
  Query: {
    /**
     * Get all content (simplified version)
     */
    content: async (_: any, args: any, context: GraphQLContext) => {
      try {
        const contents = await context.prisma.content.findMany({
          where: {
            deletedAt: null,
            status: 'PUBLISHED'
          },
          include: {
            tenant: true
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        });

        return contents;
      } catch (error) {
        logger.error('Error fetching content', error as Error);
        throw new Error('Failed to fetch content');
      }
    },

    /**
     * Get content by ID (simplified version)
     */
    contentById: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      try {
        const content = await context.prisma.content.findUnique({
          where: { id },
          include: {
            tenant: true
          }
        });

        if (!content || content.deletedAt) {
          throw new Error('Content not found');
        }

        return content;
      } catch (error) {
        logger.error('Error fetching content by ID', error as Error);
        throw new Error('Failed to fetch content');
      }
    }
  },

  Mutation: {
    /**
     * Create content (simplified version)
     */
    createContent: async (_: any, { input }: any, context: GraphQLContext) => {
      try {
        // For now, we'll use a default tenant ID if available
        const defaultTenant = await context.prisma.tenant.findFirst({
          where: { status: 'ACTIVE' }
        });

        if (!defaultTenant) {
          throw new Error('No active tenant found');
        }

        const content = await context.prisma.content.create({
          data: {
            ...input,
            tenantId: defaultTenant.id,
            status: 'DRAFT'
          },
          include: {
            tenant: true
          }
        });

        return content;
      } catch (error) {
        logger.error('Error creating content', error as Error);
        throw new Error('Failed to create content');
      }
    }
  },

  Content: {
    // Basic field resolvers
    tenant: (parent: any) => parent.tenant,
    createdAt: (parent: any) => parent.createdAt,
    updatedAt: (parent: any) => parent.updatedAt
  }
};