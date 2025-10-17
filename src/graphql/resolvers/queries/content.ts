import { GraphQLContext } from '@/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CONTENT_QUERIES');

/**
 * Content Query Resolvers
 * Handles content queries for the CMS
 */
export const contentQueries = {
  /**
   * Get all content with basic filtering
   */
  content: async (_: any, args: any, context: GraphQLContext) => {
    try {
      const { status = 'PUBLISHED', limit = 10, offset = 0 } = args;

      const contents = await context.prisma.content.findMany({
        where: {
          deletedAt: null,
          status: status
        },
        include: {
          tenant: true
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      });

      return contents;
    } catch (error) {
      logger.error('Error fetching content', error as Error);
      throw new Error('Failed to fetch content');
    }
  },

  /**
   * Get content by ID
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
};
