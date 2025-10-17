import { GraphQLContext } from '@/types';
import { createLogger } from '@/utils/logger';
import { slugify } from '@/utils/index';

const logger = createLogger('MERCH_MUTATIONS');

/**
 * Merch Mutation Resolvers
 * Handles merchandise product and category mutations with authentication
 */
export const merchMutations = {
  /**
   * Create new merchandise product
   */
  createMerchProduct: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const { input } = args;

      // Generate slug if not provided
      const slug =
        input.slug ||
        slugify(typeof input.name === 'string' ? input.name : input.name.en || 'product');

      // Set published date if status is ACTIVE and no date provided
      const publishedAt =
        input.status === 'ACTIVE' && !input.publishedAt ? new Date() : input.publishedAt;

      const product = await context.prisma.merchProduct.create({
        data: {
          ...input,
          slug,
          publishedAt,
          tenantId: context.user.tenantId,
          createdById: context.user.id,
        },
        include: {
          category: true,
          tenant: true,
        },
      });

      logger.info(`Created merch product: ${product.id}`, { userId: context.user.id });
      return {
        success: true,
        message: 'Merchandise product created successfully',
        product,
      };
    } catch (error) {
      logger.error('Error creating merch product', error as Error);
      throw new Error('Failed to create merchandise product');
    }
  },

  /**
   * Update existing merchandise product
   */
  updateMerchProduct: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const { id, input } = args;

      // Check if product exists
      const existingProduct = await context.prisma.merchProduct.findUnique({
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
      updateData.updatedById = context.user.id;

      const product = await context.prisma.merchProduct.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          tenant: true,
        },
      });

      logger.info(`Updated merch product: ${product.id}`, { userId: context.user.id });
      return {
        success: true,
        message: 'Merchandise product updated successfully',
        product,
      };
    } catch (error) {
      logger.error('Error updating merch product', error as Error);
      throw new Error('Failed to update merchandise product');
    }
  },

  /**
   * Delete merchandise product (soft delete)
   */
  deleteMerchProduct: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const { id } = args;

      const product = await context.prisma.merchProduct.findUnique({
        where: { id },
      });

      if (!product || product.deletedAt) {
        throw new Error('Merchandise product not found');
      }

      await context.prisma.merchProduct.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedById: context.user.id,
        },
      });

      logger.info(`Deleted merch product: ${id}`, { userId: context.user.id });
      return {
        success: true,
        message: 'Merchandise product deleted successfully',
      };
    } catch (error) {
      logger.error('Error deleting merch product', error as Error);
      return {
        success: false,
        message: 'Failed to delete merchandise product',
      };
    }
  },

  /**
   * Create new merchandise category
   */
  createMerchCategory: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const { input } = args;

      // Generate slug if not provided
      const slug =
        input.slug ||
        slugify(typeof input.name === 'string' ? input.name : input.name.en || 'category');

      const category = await context.prisma.merchCategory.create({
        data: {
          ...input,
          slug,
          tenantId: context.user.tenantId,
        },
        include: {
          products: true,
          parent: true,
          children: true,
          tenant: true,
        },
      });

      logger.info(`Created merch category: ${category.id}`, { userId: context.user.id });
      return {
        success: true,
        message: 'Merchandise category created successfully',
        category,
      };
    } catch (error) {
      logger.error('Error creating merch category', error as Error);
      throw new Error('Failed to create merchandise category');
    }
  },

  /**
   * Update existing merchandise category
   */
  updateMerchCategory: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const { id, input } = args;

      const category = await context.prisma.merchCategory.update({
        where: { id },
        data: input,
        include: {
          products: true,
          parent: true,
          children: true,
          tenant: true,
        },
      });

      logger.info(`Updated merch category: ${category.id}`, { userId: context.user.id });
      return {
        success: true,
        message: 'Merchandise category updated successfully',
        category,
      };
    } catch (error) {
      logger.error('Error updating merch category', error as Error);
      throw new Error('Failed to update merchandise category');
    }
  },

  /**
   * Delete merchandise category (soft delete)
   */
  deleteMerchCategory: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const { id } = args;

      // Check if category has products
      const productsCount = await context.prisma.merchProduct.count({
        where: {
          categoryId: id,
          deletedAt: null
        },
      });

      if (productsCount > 0) {
        throw new Error('Cannot delete category with existing products');
      }

      await context.prisma.merchCategory.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      logger.info(`Deleted merch category: ${id}`, { userId: context.user.id });
      return {
        success: true,
        message: 'Merchandise category deleted successfully',
      };
    } catch (error) {
      logger.error('Error deleting merch category', error as Error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete merchandise category',
      };
    }
  },
};
