import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { slugify } from '../utils/index';

const prisma = new PrismaClient();

/**
 * GraphQL resolvers for news functionality
 * Handles news articles and categories with multi-language support
 */
export const newsResolvers = {
  Query: {
    /**
     * Get news articles with filtering and pagination
     */
    newsArticles: async (_parent: any, args: any, _context: any) => {
      try {
        const { language = 'en', status, priority, categoryId, limit = 50, offset = 0 } = args;

        // Build where clause
        const where: any = {};

        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (categoryId) where.categoryId = categoryId;

        const articles = await prisma.newsArticle.findMany({
          where,
          include: {
            category: true,
            tenant: true,
          },
          take: limit,
          skip: offset,
          orderBy: [
            { isBreaking: 'desc' },
            { priority: 'desc' },
            { publishedAt: 'desc' },
            { createdAt: 'desc' },
          ],
        });

        // Transform for localization
        return articles.map(article => ({
          ...article,
          title: getLocalizedContent(article.title, language),
          subtitle: article.subtitle ? getLocalizedContent(article.subtitle, language) : null,
          excerpt: article.excerpt ? getLocalizedContent(article.excerpt, language) : null,
          location: article.location ? getLocalizedContent(article.location, language) : null,
          blocks: getLocalizedContent(article.blocks, language),
          category: article.category
            ? {
                ...article.category,
                name: getLocalizedContent(article.category.name, language),
                description: article.category.description
                  ? getLocalizedContent(article.category.description, language)
                  : null,
              }
            : null,
        }));
      } catch (error) {
        logger.error('Error fetching news articles:', error);
        throw new Error('Failed to fetch news articles');
      }
    },

    /**
     * Get single news article by ID
     */
    newsArticleById: async (_parent: any, args: any, _context: any) => {
      try {
        const { id, language = 'en' } = args;

        const article = await prisma.newsArticle.findUnique({
          where: { id },
          include: {
            category: true,
            tenant: true,
          },
        });

        if (!article) return null;

        // Transform for localization
        return {
          ...article,
          title: getLocalizedContent(article.title, language),
          subtitle: article.subtitle ? getLocalizedContent(article.subtitle, language) : null,
          excerpt: article.excerpt ? getLocalizedContent(article.excerpt, language) : null,
          location: article.location ? getLocalizedContent(article.location, language) : null,
          blocks: getLocalizedContent(article.blocks, language),
          category: article.category
            ? {
                ...article.category,
                name: getLocalizedContent(article.category.name, language),
                description: article.category.description
                  ? getLocalizedContent(article.category.description, language)
                  : null,
              }
            : null,
        };
      } catch (error) {
        logger.error('Error fetching news article:', error);
        throw new Error('Failed to fetch news article');
      }
    },

    /**
     * Get news categories
     */
    newsCategories: async (_parent: any, args: any, _context: any) => {
      try {
        const { language = 'en' } = args;

        const categories = await prisma.newsCategory.findMany({
          include: {
            articles: true,
            tenant: true,
          },
          orderBy: { name: 'asc' },
        });

        // Transform for localization
        return categories.map(category => ({
          ...category,
          name: getLocalizedContent(category.name, language),
          description: category.description
            ? getLocalizedContent(category.description, language)
            : null,
        }));
      } catch (error) {
        logger.error('Error fetching news categories:', error);
        throw new Error('Failed to fetch news categories');
      }
    },

    /**
     * Get single news category by ID
     */
    newsCategoryById: async (_parent: any, args: any, _context: any) => {
      try {
        const { id, language = 'en' } = args;

        const category = await prisma.newsCategory.findUnique({
          where: { id },
          include: {
            articles: true,
            tenant: true,
          },
        });

        if (!category) return null;

        // Transform for localization
        return {
          ...category,
          name: getLocalizedContent(category.name, language),
          description: category.description
            ? getLocalizedContent(category.description, language)
            : null,
        };
      } catch (error) {
        logger.error('Error fetching news category:', error);
        throw new Error('Failed to fetch news category');
      }
    },
  },

  Mutation: {
    /**
     * Create new news article
     */
    createNewsArticle: async (_parent: any, args: any, context: any) => {
      try {
        const { input } = args;

        // Generate slug if not provided
        const slug =
          input.slug ||
          slugify(typeof input.title === 'string' ? input.title : input.title.en || 'article');

        // Set published date if status is PUBLISHED and no date provided
        const publishedAt =
          input.status === 'PUBLISHED' && !input.publishedAt ? new Date() : input.publishedAt;

        const article = await prisma.newsArticle.create({
          data: {
            ...input,
            slug,
            publishedAt,
            tenantId: context.tenantId || 'default', // TODO: Get from auth context
          },
          include: {
            category: true,
            tenant: true,
          },
        });

        logger.info(`Created news article: ${article.id}`);
        return {
          success: true,
          message: 'News article created successfully',
          article,
        };
      } catch (error) {
        logger.error('Error creating news article:', error);
        throw new Error('Failed to create news article');
      }
    },

    /**
     * Update existing news article
     */
    updateNewsArticle: async (_parent: any, args: any, context: any) => {
      try {
        const { id, input } = args;

        // Check if article exists
        const existingArticle = await prisma.newsArticle.findUnique({
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

        const article = await prisma.newsArticle.update({
          where: { id },
          data: updateData,
          include: {
            category: true,
            tenant: true,
          },
        });

        logger.info(`Updated news article: ${article.id}`);
        return {
          success: true,
          message: 'News article updated successfully',
          article,
        };
      } catch (error) {
        logger.error('Error updating news article:', error);
        throw new Error('Failed to update news article');
      }
    },

    /**
     * Delete news article
     */
    deleteNewsArticle: async (_parent: any, args: any, context: any) => {
      try {
        const { id } = args;

        const article = await prisma.newsArticle.findUnique({
          where: { id },
        });

        if (!article) {
          throw new Error('News article not found');
        }

        await prisma.newsArticle.delete({
          where: { id },
        });

        logger.info(`Deleted news article: ${id}`);
        return {
          success: true,
          message: 'News article deleted successfully',
        };
      } catch (error) {
        logger.error('Error deleting news article:', error);
        return {
          success: false,
          message: 'Failed to delete news article',
        };
      }
    },

    /**
     * Create new news category
     */
    createNewsCategory: async (_parent: any, args: any, context: any) => {
      try {
        const { input } = args;

        // Generate slug if not provided
        const slug =
          input.slug ||
          slugify(typeof input.name === 'string' ? input.name : input.name.en || 'category');

        const category = await prisma.newsCategory.create({
          data: {
            ...input,
            slug,
            tenantId: context.tenantId || 'default', // TODO: Get from auth context
          },
          include: {
            articles: true,
            tenant: true,
          },
        });

        logger.info(`Created news category: ${category.id}`);
        return {
          success: true,
          message: 'News category created successfully',
          category,
        };
      } catch (error) {
        logger.error('Error creating news category:', error);
        throw new Error('Failed to create news category');
      }
    },

    /**
     * Update existing news category
     */
    updateNewsCategory: async (_parent: any, args: any, context: any) => {
      try {
        const { id, input } = args;

        const category = await prisma.newsCategory.update({
          where: { id },
          data: input,
          include: {
            articles: true,
            tenant: true,
          },
        });

        logger.info(`Updated news category: ${category.id}`);
        return {
          success: true,
          message: 'News category updated successfully',
          category,
        };
      } catch (error) {
        logger.error('Error updating news category:', error);
        throw new Error('Failed to update news category');
      }
    },

    /**
     * Delete news category
     */
    deleteNewsCategory: async (_parent: any, args: any, context: any) => {
      try {
        const { id } = args;

        // Check if category has articles
        const articlesCount = await prisma.newsArticle.count({
          where: { categoryId: id },
        });

        if (articlesCount > 0) {
          throw new Error('Cannot delete category with existing articles');
        }

        await prisma.newsCategory.delete({
          where: { id },
        });

        logger.info(`Deleted news category: ${id}`);
        return {
          success: true,
          message: 'News category deleted successfully',
        };
      } catch (error) {
        logger.error('Error deleting news category:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to delete news category',
        };
      }
    },
  },
};

/**
 * Helper function to get localized content from JSON field
 */
function getLocalizedContent(content: any, language: string): any {
  if (!content) return null;

  if (typeof content === 'object') {
    // Return specific language or fallback to English or first available
    return content[language] || content.en || Object.values(content)[0];
  }

  return content;
}
