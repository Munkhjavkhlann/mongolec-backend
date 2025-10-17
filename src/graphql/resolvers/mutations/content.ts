import { GraphQLContext } from '@/types';
import { createLogger } from '@/utils/logger';
import { slugify } from '@/utils/index';

const logger = createLogger('CONTENT_MUTATIONS');

/**
 * Content Mutation Resolvers
 * Handles content creation, updates, and deletion with authentication
 */
export const contentMutations = {
  /**
   * Create content
   */
  createContent: async (_: any, { input }: any, context: GraphQLContext) => {
    try {
      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Generate slug if not provided
      const slug = input.slug || slugify(input.title || 'content');

      const content = await context.prisma.content.create({
        data: {
          ...input,
          slug,
          tenantId: context.user.tenantId,
          status: input.status || 'DRAFT',
          createdById: context.user.id,
        },
        include: {
          tenant: true
        }
      });

      logger.info(`Created content: ${content.id}`, { userId: context.user.id });
      return {
        success: true,
        message: 'Content created successfully',
        content,
      };
    } catch (error) {
      logger.error('Error creating content', error as Error);
      throw new Error('Failed to create content');
    }
  },

  /**
   * Update content
   */
  updateContent: async (_: any, { id, input }: any, context: GraphQLContext) => {
    try {
      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check if content exists
      const existingContent = await context.prisma.content.findUnique({
        where: { id },
      });

      if (!existingContent || existingContent.deletedAt) {
        throw new Error('Content not found');
      }

      // Update slug if title changed
      const updateData: any = { ...input };
      if (input.title && !input.slug) {
        updateData.slug = slugify(input.title);
      }

      // Set published date if status changed to PUBLISHED
      if (
        input.status === 'PUBLISHED' &&
        existingContent.status !== 'PUBLISHED' &&
        !input.publishedAt
      ) {
        updateData.publishedAt = new Date();
      }

      // Set updated by user
      updateData.updatedById = context.user.id;

      const content = await context.prisma.content.update({
        where: { id },
        data: updateData,
        include: {
          tenant: true
        }
      });

      logger.info(`Updated content: ${content.id}`, { userId: context.user.id });
      return {
        success: true,
        message: 'Content updated successfully',
        content,
      };
    } catch (error) {
      logger.error('Error updating content', error as Error);
      throw new Error('Failed to update content');
    }
  },

  /**
   * Delete content (soft delete)
   */
  deleteContent: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    try {
      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const content = await context.prisma.content.findUnique({
        where: { id },
      });

      if (!content || content.deletedAt) {
        throw new Error('Content not found');
      }

      await context.prisma.content.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedById: context.user.id,
        },
      });

      logger.info(`Deleted content: ${id}`, { userId: context.user.id });
      return {
        success: true,
        message: 'Content deleted successfully',
      };
    } catch (error) {
      logger.error('Error deleting content', error as Error);
      return {
        success: false,
        message: 'Failed to delete content',
      };
    }
  },
};
