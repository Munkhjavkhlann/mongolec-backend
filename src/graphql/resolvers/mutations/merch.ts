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

      // Extract variants from input
      const { variants, ...productData } = input;

      // Generate slug if not provided
      const slug =
        productData.slug ||
        slugify(
          typeof productData.name === 'string' ? productData.name : productData.name.en || 'product'
        );

      // Set published date if status is ACTIVE and no date provided
      const publishedAt =
        productData.status === 'ACTIVE' && !productData.publishedAt
          ? new Date()
          : productData.publishedAt;

      const product = await context.prisma.merchProduct.create({
        data: {
          ...productData,
          slug,
          publishedAt,
          tenantId: context.user.tenantId,
          createdById: context.user.id,
          // Create variants if provided
          productVariants:
            variants && variants.length > 0
              ? {
                  create: variants.map((variant: any, index: number) => ({
                    ...variant,
                    position: variant.position ?? index,
                    inventory: variant.inventory ?? 0,
                    isAvailable: variant.isAvailable ?? true,
                  })),
                }
              : undefined,
        },
        include: {
          category: true,
          tenant: true,
          productVariants: {
            where: { deletedAt: null },
            orderBy: { position: 'asc' },
          },
        },
      });

      logger.info(`Created merch product: ${product.id}`, { userId: context.user.id });
      return product;
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

      // Extract variants from input
      const { variants, ...productData } = input;

      // Update slug if name changed
      const updateData: any = { ...productData };
      if (productData.name && !productData.slug) {
        updateData.slug = slugify(
          typeof productData.name === 'string' ? productData.name : productData.name.en || 'product'
        );
      }

      // Set published date if status changed to ACTIVE
      if (
        productData.status === 'ACTIVE' &&
        existingProduct.status !== 'ACTIVE' &&
        !productData.publishedAt
      ) {
        updateData.publishedAt = new Date();
      }

      // Set updated by user
      updateData.updatedById = context.user.id;

      // Handle variant updates
      // If variants are provided, delete existing and create new ones
      if (variants !== undefined) {
        // Delete existing variants
        await context.prisma.merchVariant.deleteMany({
          where: { productId: id },
        });

        // Create new variants if provided
        if (variants && variants.length > 0) {
          updateData.productVariants = {
            create: variants.map((variant: any, index: number) => ({
              ...variant,
              position: variant.position ?? index,
              inventory: variant.inventory ?? 0,
              isAvailable: variant.isAvailable ?? true,
            })),
          };
        }
      }

      const product = await context.prisma.merchProduct.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          tenant: true,
          productVariants: {
            where: { deletedAt: null },
            orderBy: { position: 'asc' },
          },
        },
      });

      logger.info(`Updated merch product: ${product.id}`, { userId: context.user.id });
      return product;
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
      return true;
    } catch (error) {
      logger.error('Error deleting merch product', error as Error);
      throw new Error('Failed to delete merchandise product');
    }
  },

  /**
   * Create individual merchandise variant
   */
  createMerchVariant: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const { productId, input } = args;

      // Check if product exists
      const product = await context.prisma.merchProduct.findUnique({
        where: { id: productId },
      });

      if (!product || product.deletedAt) {
        throw new Error('Product not found');
      }

      const variant = await context.prisma.merchVariant.create({
        data: {
          ...input,
          productId,
          inventory: input.inventory ?? 0,
          isAvailable: input.isAvailable ?? true,
        },
      });

      logger.info(`Created variant: ${variant.id} for product: ${productId}`, {
        userId: context.user.id,
      });
      return variant;
    } catch (error) {
      logger.error('Error creating variant', error as Error);
      throw new Error('Failed to create variant');
    }
  },

  /**
   * Update merchandise variant
   */
  updateMerchVariant: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const { id, input } = args;

      const variant = await context.prisma.merchVariant.update({
        where: { id },
        data: input,
      });

      logger.info(`Updated variant: ${variant.id}`, { userId: context.user.id });
      return variant;
    } catch (error) {
      logger.error('Error updating variant', error as Error);
      throw new Error('Failed to update variant');
    }
  },

  /**
   * Delete merchandise variant
   */
  deleteMerchVariant: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const { id } = args;

      await context.prisma.merchVariant.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      logger.info(`Deleted variant: ${id}`, { userId: context.user.id });
      return true;
    } catch (error) {
      logger.error('Error deleting variant', error as Error);
      throw new Error('Failed to delete variant');
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
      return category;
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
      return category;
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
          deletedAt: null,
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
      return true;
    } catch (error) {
      logger.error('Error deleting merch category', error as Error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to delete merchandise category'
      );
    }
  },
};
