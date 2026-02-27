import { GraphQLContext } from '@/types';
import { createLogger } from '@/utils/logger';
import { slugify } from '@/utils/index';
import {
  authenticated,
  withPermission
} from '@/graphql/decorators/auth';
import {
  NotFoundError,
  ValidationError
} from '@/utils/errors';
import type {
  CreateContentArgs,
  UpdateContentArgs
} from '@/graphql/types/args';

const logger = createLogger('CONTENT_MUTATIONS');

// Permission constants
const PERMISSIONS = {
  CREATE_CONTENT: 'content:create',
  UPDATE_CONTENT: 'content:update',
  DELETE_CONTENT: 'content:delete',
} as const;

/**
 * Content Mutation Resolvers
 * Handles content creation, updates, and deletion with authentication
 */
export const contentMutations = {
  /**
   * Create content
   */
  createContent: withPermission(PERMISSIONS.CREATE_CONTENT)(authenticated(
    async (_parent: unknown, args: CreateContentArgs, context: GraphQLContext) => {
      const { input } = args;

      // Generate slug if not provided
      const slug = input.slug || slugify(
        typeof input.title === 'string' ? input.title : input.title.en || 'content'
      );

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
    }
  )),

  /**
   * Update content
   */
  updateContent: withPermission(PERMISSIONS.UPDATE_CONTENT)(authenticated(
    async (_parent: unknown, args: UpdateContentArgs, context: GraphQLContext) => {
      const { id, input } = args;

      // Check if content exists
      const existingContent = await context.prisma.content.findUnique({
        where: { id },
      });

      if (!existingContent || existingContent.deletedAt) {
        throw new NotFoundError('Content');
      }

      // Update slug if title changed
      const updateData: any = { ...input };
      if (input.title && !input.slug) {
        updateData.slug = slugify(
          typeof input.title === 'string' ? input.title : input.title.en || 'content'
        );
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
    }
  )),

  /**
   * Delete content (soft delete)
   */
  deleteContent: withPermission(PERMISSIONS.DELETE_CONTENT)(authenticated(
    async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      const { id } = args;

      const content = await context.prisma.content.findUnique({
        where: { id },
      });

      if (!content || content.deletedAt) {
        throw new NotFoundError('Content');
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
    }
  )),
};
