import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { slugify } from '../utils/index';

const prisma = new PrismaClient();

/**
 * GraphQL resolvers for merchandise functionality
 * Handles merch products and categories with multi-language support
 */
export const merchResolvers = {
  Query: {
    /**
     * Get merchandise products with filtering and pagination
     */
    merchProducts: async (_parent: any, args: any, _context: any) => {
      try {
        const { language = 'en', status, categoryId, isFeatured, limit = 50, offset = 0 } = args;

        // Build where clause
        const where: any = { deletedAt: null };

        if (status) where.status = status;
        if (categoryId) where.categoryId = categoryId;
        if (isFeatured !== undefined) where.isFeatured = isFeatured;

        const products = await prisma.merchProduct.findMany({
          where,
          include: {
            category: true,
            tenant: true,
          },
          take: limit,
          skip: offset,
          orderBy: [
            { isFeatured: 'desc' },
            { status: 'asc' },
            { createdAt: 'desc' },
          ],
        });

        // Transform for localization
        return products.map(product => ({
          ...product,
          name: getLocalizedContent(product.name, language),
          description: product.description ? getLocalizedContent(product.description, language) : null,
          shortDescription: product.shortDescription ? getLocalizedContent(product.shortDescription, language) : null,
          metaTitle: product.metaTitle ? getLocalizedContent(product.metaTitle, language) : null,
          metaDescription: product.metaDescription ? getLocalizedContent(product.metaDescription, language) : null,
          searchKeywords: product.searchKeywords ? getLocalizedContent(product.searchKeywords, language) : null,
          category: product.category
            ? {
                ...product.category,
                name: getLocalizedContent(product.category.name, language),
                description: product.category.description
                  ? getLocalizedContent(product.category.description, language)
                  : null,
              }
            : null,
        }));
      } catch (error) {
        logger.error('Error fetching merch products:', error);
        throw new Error('Failed to fetch merch products');
      }
    },

    /**
     * Get single merchandise product by ID
     */
    merchProductById: async (_parent: any, args: any, _context: any) => {
      try {
        const { id, language = 'en' } = args;

        const product = await prisma.merchProduct.findUnique({
          where: { id },
          include: {
            category: true,
            tenant: true,
          },
        });

        if (!product || product.deletedAt) return null;

        // Transform for localization
        return {
          ...product,
          name: getLocalizedContent(product.name, language),
          description: product.description ? getLocalizedContent(product.description, language) : null,
          shortDescription: product.shortDescription ? getLocalizedContent(product.shortDescription, language) : null,
          metaTitle: product.metaTitle ? getLocalizedContent(product.metaTitle, language) : null,
          metaDescription: product.metaDescription ? getLocalizedContent(product.metaDescription, language) : null,
          searchKeywords: product.searchKeywords ? getLocalizedContent(product.searchKeywords, language) : null,
          category: product.category
            ? {
                ...product.category,
                name: getLocalizedContent(product.category.name, language),
                description: product.category.description
                  ? getLocalizedContent(product.category.description, language)
                  : null,
              }
            : null,
        };
      } catch (error) {
        logger.error('Error fetching merch product:', error);
        throw new Error('Failed to fetch merch product');
      }
    },

    /**
     * Get merchandise categories
     */
    merchCategories: async (_parent: any, args: any, _context: any) => {
      try {
        const { language = 'en' } = args;

        const categories = await prisma.merchCategory.findMany({
          where: { deletedAt: null },
          include: {
            products: true,
            parent: true,
            children: true,
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
          parent: category.parent
            ? {
                ...category.parent,
                name: getLocalizedContent(category.parent.name, language),
                description: category.parent.description
                  ? getLocalizedContent(category.parent.description, language)
                  : null,
              }
            : null,
          children: category.children.map(child => ({
            ...child,
            name: getLocalizedContent(child.name, language),
            description: child.description
              ? getLocalizedContent(child.description, language)
              : null,
          })),
        }));
      } catch (error) {
        logger.error('Error fetching merch categories:', error);
        throw new Error('Failed to fetch merch categories');
      }
    },

    /**
     * Get single merchandise category by ID
     */
    merchCategoryById: async (_parent: any, args: any, _context: any) => {
      try {
        const { id, language = 'en' } = args;

        const category = await prisma.merchCategory.findUnique({
          where: { id },
          include: {
            products: true,
            parent: true,
            children: true,
            tenant: true,
          },
        });

        if (!category || category.deletedAt) return null;

        // Transform for localization
        return {
          ...category,
          name: getLocalizedContent(category.name, language),
          description: category.description
            ? getLocalizedContent(category.description, language)
            : null,
          parent: category.parent
            ? {
                ...category.parent,
                name: getLocalizedContent(category.parent.name, language),
                description: category.parent.description
                  ? getLocalizedContent(category.parent.description, language)
                  : null,
              }
            : null,
          children: category.children.map(child => ({
            ...child,
            name: getLocalizedContent(child.name, language),
            description: child.description
              ? getLocalizedContent(child.description, language)
              : null,
          })),
        };
      } catch (error) {
        logger.error('Error fetching merch category:', error);
        throw new Error('Failed to fetch merch category');
      }
    },
  },

  Mutation: {
    /**
     * Create new merchandise product
     */
    createMerchProduct: async (_parent: any, args: any, context: any) => {
      try {
        const { input } = args;

        // Generate slug if not provided
        const slug =
          input.slug ||
          slugify(typeof input.name === 'string' ? input.name : input.name.en || 'product');

        // Set published date if status is ACTIVE and no date provided
        const publishedAt =
          input.status === 'ACTIVE' && !input.publishedAt ? new Date() : input.publishedAt;

        const product = await prisma.merchProduct.create({
          data: {
            ...input,
            slug,
            publishedAt,
            tenantId: context.tenantId || 'default', // TODO: Get from auth context
            createdById: context.userId || 'default', // TODO: Get from auth context
          },
          include: {
            category: true,
            tenant: true,
          },
        });

        logger.info(`Created merch product: ${product.id}`);
        return {
          success: true,
          message: 'Merchandise product created successfully',
          product,
        };
      } catch (error) {
        logger.error('Error creating merch product:', error);
        throw new Error('Failed to create merchandise product');
      }
    },

    /**
     * Update existing merchandise product
     */
    updateMerchProduct: async (_parent: any, args: any, context: any) => {
      try {
        const { id, input } = args;

        // Check if product exists
        const existingProduct = await prisma.merchProduct.findUnique({
          where: { id },
        });

        if (!existingProduct || existingProduct.deletedAt) {
          throw new Error('Merchandise product not found');
        }

        // Update slug if name changed
        const updateData: any = { ...input };
        if (input.name && !input.slug) {
          updateData.slug = slugify(
            typeof input.name === 'string' ? input.name : input.name.en || 'product'
          );
        }

        // Set published date if status changed to ACTIVE
        if (
          input.status === 'ACTIVE' &&
          existingProduct.status !== 'ACTIVE' &&
          !input.publishedAt
        ) {
          updateData.publishedAt = new Date();
        }

        // Set updated by user
        updateData.updatedById = context.userId || 'default'; // TODO: Get from auth context

        const product = await prisma.merchProduct.update({
          where: { id },
          data: updateData,
          include: {
            category: true,
            tenant: true,
          },
        });

        logger.info(`Updated merch product: ${product.id}`);
        return {
          success: true,
          message: 'Merchandise product updated successfully',
          product,
        };
      } catch (error) {
        logger.error('Error updating merch product:', error);
        throw new Error('Failed to update merchandise product');
      }
    },

    /**
     * Delete merchandise product (soft delete)
     */
    deleteMerchProduct: async (_parent: any, args: any, context: any) => {
      try {
        const { id } = args;

        const product = await prisma.merchProduct.findUnique({
          where: { id },
        });

        if (!product || product.deletedAt) {
          throw new Error('Merchandise product not found');
        }

        await prisma.merchProduct.update({
          where: { id },
          data: {
            deletedAt: new Date(),
            updatedById: context.userId || 'default', // TODO: Get from auth context
          },
        });

        logger.info(`Deleted merch product: ${id}`);
        return {
          success: true,
          message: 'Merchandise product deleted successfully',
        };
      } catch (error) {
        logger.error('Error deleting merch product:', error);
        return {
          success: false,
          message: 'Failed to delete merchandise product',
        };
      }
    },

    /**
     * Create new merchandise category
     */
    createMerchCategory: async (_parent: any, args: any, context: any) => {
      try {
        const { input } = args;

        // Generate slug if not provided
        const slug =
          input.slug ||
          slugify(typeof input.name === 'string' ? input.name : input.name.en || 'category');

        const category = await prisma.merchCategory.create({
          data: {
            ...input,
            slug,
            tenantId: context.tenantId || 'default', // TODO: Get from auth context
          },
          include: {
            products: true,
            parent: true,
            children: true,
            tenant: true,
          },
        });

        logger.info(`Created merch category: ${category.id}`);
        return {
          success: true,
          message: 'Merchandise category created successfully',
          category,
        };
      } catch (error) {
        logger.error('Error creating merch category:', error);
        throw new Error('Failed to create merchandise category');
      }
    },

    /**
     * Update existing merchandise category
     */
    updateMerchCategory: async (_parent: any, args: any, context: any) => {
      try {
        const { id, input } = args;

        const category = await prisma.merchCategory.update({
          where: { id },
          data: input,
          include: {
            products: true,
            parent: true,
            children: true,
            tenant: true,
          },
        });

        logger.info(`Updated merch category: ${category.id}`);
        return {
          success: true,
          message: 'Merchandise category updated successfully',
          category,
        };
      } catch (error) {
        logger.error('Error updating merch category:', error);
        throw new Error('Failed to update merchandise category');
      }
    },

    /**
     * Delete merchandise category (soft delete)
     */
    deleteMerchCategory: async (_parent: any, args: any, context: any) => {
      try {
        const { id } = args;

        // Check if category has products
        const productsCount = await prisma.merchProduct.count({
          where: {
            categoryId: id,
            deletedAt: null
          },
        });

        if (productsCount > 0) {
          throw new Error('Cannot delete category with existing products');
        }

        await prisma.merchCategory.update({
          where: { id },
          data: { deletedAt: new Date() },
        });

        logger.info(`Deleted merch category: ${id}`);
        return {
          success: true,
          message: 'Merchandise category deleted successfully',
        };
      } catch (error) {
        logger.error('Error deleting merch category:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to delete merchandise category',
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