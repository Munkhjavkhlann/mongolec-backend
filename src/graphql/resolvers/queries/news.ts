import { GraphQLContext } from '@/types';
import { createLogger } from '@/utils/logger';
import { getLocalizedContent } from '@/libs/localization';

const logger = createLogger('NEWS_QUERIES');

/**
 * News Query Resolvers
 * Handles news articles and categories queries with multi-language support
 */
export const newsQueries = {
  /**
   * Get news articles with filtering and pagination
   */
  newsArticles: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { language = 'en', status, priority, categoryId, limit = 50, offset = 0 } = args;

      // Build where clause
      const where: any = {};
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (categoryId) where.categoryId = categoryId;

      const articles = await context.prisma.newsArticle.findMany({
        where,
        include: {
          category: true,
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
        byline: article.byline ? getLocalizedContent(article.byline, language) : null,
        location: article.location ? getLocalizedContent(article.location, language) : null,
        blocks: getLocalizedContent(article.blocks, language),
        metaTitle: article.metaTitle ? getLocalizedContent(article.metaTitle, language) : null,
        metaDescription: article.metaDescription ? getLocalizedContent(article.metaDescription, language) : null,
        keywords: article.keywords ? getLocalizedContent(article.keywords, language) : null,
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
      logger.error('Error fetching news articles', error as Error);
      throw new Error('Failed to fetch news articles');
    }
  },

  /**
   * Get single news article by ID
   */
  newsArticleById: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { id, language = 'en' } = args;

      const article = await context.prisma.newsArticle.findUnique({
        where: { id },
        include: {
          category: true,
        },
      });

      if (!article) return null;

      // Transform for localization
      return {
        ...article,
        title: getLocalizedContent(article.title, language),
        subtitle: article.subtitle ? getLocalizedContent(article.subtitle, language) : null,
        excerpt: article.excerpt ? getLocalizedContent(article.excerpt, language) : null,
        byline: article.byline ? getLocalizedContent(article.byline, language) : null,
        location: article.location ? getLocalizedContent(article.location, language) : null,
        blocks: getLocalizedContent(article.blocks, language),
        metaTitle: article.metaTitle ? getLocalizedContent(article.metaTitle, language) : null,
        metaDescription: article.metaDescription ? getLocalizedContent(article.metaDescription, language) : null,
        keywords: article.keywords ? getLocalizedContent(article.keywords, language) : null,
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
      logger.error('Error fetching news article', error as Error);
      throw new Error('Failed to fetch news article');
    }
  },

  /**
   * Get news categories
   */
  newsCategories: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { language = 'en' } = args;

      const categories = await context.prisma.newsCategory.findMany({
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
      logger.error('Error fetching news categories', error as Error);
      throw new Error('Failed to fetch news categories');
    }
  },

  /**
   * Get single news category by ID
   */
  newsCategoryById: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { id, language = 'en' } = args;

      const category = await context.prisma.newsCategory.findUnique({
        where: { id },
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
      logger.error('Error fetching news category', error as Error);
      throw new Error('Failed to fetch news category');
    }
  },
};
