import { GraphQLContext } from '@/types';
import { ValidationError, NotFoundError } from '@/utils/errors';
import { generateRandomString } from '@/utils/index';
import { getLocalizedContent } from '@/libs/localization';
import { createLogger } from '@/utils/logger';
import { authenticated, withPermission } from '@/graphql/decorators/auth';

const VALID_ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const logger = createLogger('MERCH_ORDER_MUTATIONS');

export interface CreateMerchOrderItemInput {
  productId: string;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
}

export interface CreateMerchOrderInput {
  customerName: string;
  phone: string;
  email?: string | null;
  address: string;
  notes?: string | null;
  currency?: string | null;
  tenantId?: string | null;
  items: CreateMerchOrderItemInput[];
}

export function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `MEC-${date}-${generateRandomString(6).toUpperCase()}`;
}

export const createMerchOrder = async (
  _parent: unknown,
  args: { input: CreateMerchOrderInput },
  context: GraphQLContext
) => {
  const { input } = args;

  if (!input.customerName?.trim()) throw new ValidationError('Customer name is required');
  if (!input.phone?.trim()) throw new ValidationError('Phone is required');
  if (!input.address?.trim()) throw new ValidationError('Delivery address is required');
  if (!input.items?.length) throw new ValidationError('Cart is empty');

  // Tenant is taken from the request context or explicit input, and otherwise
  // derived from the ordered products themselves (a guest storefront does not
  // know the real tenant id). Resolved inside the transaction once products load.
  let tenantId = context.tenant?.id || input.tenantId || undefined;

  try {
    const order = await (context.prisma as any).$transaction(async (tx: any) => {
      let subtotal = 0;
      const itemsData: any[] = [];

      for (const item of input.items) {
        if (!item.quantity || item.quantity < 1) {
          throw new ValidationError('Item quantity must be at least 1');
        }
        const product = await tx.merchProduct.findUnique({ where: { id: item.productId } });
        if (!product || product.deletedAt) throw new NotFoundError('Merchandise product');
        if (product.status !== 'ACTIVE') {
          throw new ValidationError(`Product is not available: ${item.productId}`);
        }
        if (!tenantId) tenantId = product.tenantId;
        if (
          product.trackInventory &&
          !product.allowBackorder &&
          product.inventory < item.quantity
        ) {
          throw new ValidationError(`Insufficient stock for product: ${item.productId}`);
        }

        const unitPrice = product.price;
        subtotal += unitPrice * item.quantity;
        itemsData.push({
          productId: product.id,
          name: getLocalizedContent(product.name, 'en') || '',
          image: product.featuredImage ?? null,
          variantId: item.variantId ?? null,
          variantName: item.variantName ?? null,
          unitPrice,
          quantity: item.quantity,
        });

        if (product.trackInventory) {
          await tx.merchProduct.update({
            where: { id: product.id },
            data: { inventory: { decrement: item.quantity } },
          });
        }
      }

      const total = subtotal;

      if (!tenantId) throw new ValidationError('Tenant could not be determined for this order');

      return tx.merchOrder.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: context.user?.id ?? null,
          customerName: input.customerName.trim(),
          phone: input.phone.trim(),
          email: input.email ?? null,
          address: input.address.trim(),
          notes: input.notes ?? null,
          status: 'PENDING',
          paymentMethod: 'BANK_TRANSFER',
          subtotal,
          total,
          currency: input.currency ?? 'MNT',
          tenantId,
          items: { create: itemsData },
        },
        include: { items: true },
      });
    });

    return order;
  } catch (error) {
    logger.error('createMerchOrder failed', error as Error);
    throw error;
  }
};

export const updateMerchOrderStatus = withPermission('merch:update')(
  authenticated(
    async (_parent: unknown, args: { id: string; status: string }, context: GraphQLContext) => {
      if (!VALID_ORDER_STATUSES.includes(args.status)) {
        throw new ValidationError(`Invalid status: ${args.status}`);
      }
      return context.prisma.merchOrder.update({
        where: { id: args.id },
        data: { status: args.status as any },
        include: { items: true },
      });
    }
  )
);

export const orderMutations = {
  createMerchOrder,
  updateMerchOrderStatus,
};
