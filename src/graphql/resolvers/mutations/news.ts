import { GraphQLContext } from '@/types';
import { createLogger } from '@/utils/logger';
import { slugify } from '@/utils';

const logger = createLogger('NEWS_MUTATIONS');

/**
 * News Mutation Resolvers
 * Handles news articles and categories creation, update, and deletion
 */
export const newsMutations = {
  /**
   * Create new news article
   */
  createNewsArticle: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { input } = args;

      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Generate slug if not provided
      const slug =
        input.slug ||
        slugify(typeof input.title === 'string' ? input.title : input.title.en || 'article');

      // Set published date if status is PUBLISHED and no date provided
      const publishedAt =
        input.status === 'PUBLISHED' && !input.publishedAt ? new Date() : input.publishedAt;

      const article = await context.prisma.newsArticle.create({
        data: {
          ...input,
          slug,
          publishedAt,
          tenantId: context.tenant?.id || context.user.tenantId,
        },
        include: {
          category: true,
        },
      });

      logger.info(`Created news article: ${article.id}`);
      return article;
    } catch (error) {
      logger.error('Error creating news article', error as Error);
      throw new Error('Failed to create news article');
    }
  },

  /**
   * Update existing news article
   */
  updateNewsArticle: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { id, input } = args;

      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Check if article exists
      const existingArticle = await context.prisma.newsArticle.findUnique({
        where: { id },
      });

      if (!existingArticle) {
        throw new Error('News article not found');
      }

      // Update slug if title changed
      const updateData: any = { ...input };
      if (input.title && !input.slug) {
        updateData.slug = slugify(
          typeof input.title === 'string' ? input.title : input.title.en || 'article'
        );
      }

      // Set published date if status changed to PUBLISHED
      if (
        input.status === 'PUBLISHED' &&
        existingArticle.status !== 'PUBLISHED' &&
        !input.publishedAt
      ) {
        updateData.publishedAt = new Date();
      }

      const article = await context.prisma.newsArticle.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
        },
      });

      logger.info(`Updated news article: ${article.id}`);
      return article;
    } catch (error) {
      logger.error('Error updating news article', error as Error);
      throw new Error('Failed to update news article');
    }
  },

  /**
   * Delete news article
   */
  deleteNewsArticle: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { id } = args;

      if (!context.user) {
        throw new Error('Authentication required');
      }

      const article = await context.prisma.newsArticle.findUnique({
        where: { id },
      });

      if (!article) {
        throw new Error('News article not found');
      }

      await context.prisma.newsArticle.delete({
        where: { id },
      });

      logger.info(`Deleted news article: ${id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting news article', error as Error);
      return false;
    }
  },

  /**
   * Create new news category
   */
  createNewsCategory: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { input } = args;

      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Generate slug if not provided
      const slug =
        input.slug ||
        slugify(typeof input.name === 'string' ? input.name : input.name.en || 'category');

      const category = await context.prisma.newsCategory.create({
        data: {
          ...input,
          slug,
          tenantId: context.tenant?.id || context.user.tenantId,
        },
      });

      logger.info(`Created news category: ${category.id}`);
      return category;
    } catch (error) {
      logger.error('Error creating news category', error as Error);
      throw new Error('Failed to create news category');
    }
  },

  /**
   * Update existing news category
   */
  updateNewsCategory: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { id, input } = args;

      if (!context.user) {
        throw new Error('Authentication required');
      }

      const category = await context.prisma.newsCategory.update({
        where: { id },
        data: input,
      });

      logger.info(`Updated news category: ${category.id}`);
      return category;
    } catch (error) {
      logger.error('Error updating news category', error as Error);
      throw new Error('Failed to update news category');
    }
  },

  /**
   * Delete news category
   */
  deleteNewsCategory: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { id } = args;

      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Check if category has articles
      const articlesCount = await context.prisma.newsArticle.count({
        where: { categoryId: id },
      });

      if (articlesCount > 0) {
        throw new Error('Cannot delete category with existing articles');
      }

      await context.prisma.newsCategory.delete({
        where: { id },
      });

      logger.info(`Deleted news category: ${id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting news category', error as Error);
      return false;
    }
  },
};
