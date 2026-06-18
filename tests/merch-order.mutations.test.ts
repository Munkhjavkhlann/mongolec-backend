import { orderMutations } from '../src/graphql/resolvers/mutations/order';

function buildContext(overrides: any = {}) {
  const product = {
    id: 'prod-1',
    name: { en: 'Test Tee', mn: 'Тест' },
    price: 100,
    currency: 'MNT',
    inventory: 10,
    trackInventory: true,
    allowBackorder: false,
    status: 'ACTIVE',
    featuredImage: 'https://cdn/img.jpg',
    tenantId: 'tenant-1',
    deletedAt: null,
    ...overrides.product,
  };
  const tx = {
    merchProduct: {
      findUnique: jest.fn().mockResolvedValue(product),
      update: jest.fn().mockResolvedValue({ ...product, inventory: product.inventory - 1 }),
    },
    merchOrder: {
      create: jest
        .fn()
        .mockImplementation(({ data }: any) =>
          Promise.resolve({ id: 'order-1', ...data, items: data.items?.create ?? [] })
        ),
    },
  };
  const prisma = { $transaction: jest.fn(async (cb: any) => cb(tx)) };
  return {
    context: { prisma, user: undefined, tenant: { id: 'tenant-1' }, ...overrides.context } as any,
    tx,
    product,
  };
}

const validInput = {
  customerName: 'Bat',
  phone: '99001122',
  address: 'UB, Khan-Uul',
  items: [{ productId: 'prod-1', quantity: 2 }],
};

describe('createMerchOrder', () => {
  it('creates an order for a guest and snapshots product data', async () => {
    const { context, tx } = buildContext();
    const order = await orderMutations.createMerchOrder({}, { input: validInput }, context);
    expect(order.orderNumber).toMatch(/^MEC-\d{8}-[A-Z0-9]{6}$/);
    expect(order.userId).toBeNull();
    expect(order.subtotal).toBe(200);
    expect(order.total).toBe(200);
    expect(order.status).toBe('PENDING');
    expect(order.paymentMethod).toBe('BANK_TRANSFER');
    const createArg = tx.merchOrder.create.mock.calls[0][0].data;
    expect(createArg.items.create[0]).toMatchObject({
      productId: 'prod-1',
      name: 'Test Tee',
      image: 'https://cdn/img.jpg',
      unitPrice: 100,
      quantity: 2,
    });
  });

  it('decrements inventory by the ordered quantity', async () => {
    const { context, tx } = buildContext();
    await orderMutations.createMerchOrder({}, { input: validInput }, context);
    expect(tx.merchProduct.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { inventory: { decrement: 2 } },
    });
  });

  it('rejects an empty cart', async () => {
    const { context } = buildContext();
    await expect(
      orderMutations.createMerchOrder({}, { input: { ...validInput, items: [] } }, context)
    ).rejects.toThrow('Cart is empty');
  });

  it('rejects a missing customer name', async () => {
    const { context } = buildContext();
    await expect(
      orderMutations.createMerchOrder({}, { input: { ...validInput, customerName: '  ' } }, context)
    ).rejects.toThrow('Customer name is required');
  });

  it('rejects an inactive product', async () => {
    const { context } = buildContext({ product: { status: 'DRAFT' } });
    await expect(
      orderMutations.createMerchOrder({}, { input: validInput }, context)
    ).rejects.toThrow('not available');
  });

  it('rejects insufficient stock', async () => {
    const { context } = buildContext({ product: { inventory: 1 } });
    await expect(
      orderMutations.createMerchOrder({}, { input: validInput }, context)
    ).rejects.toThrow('Insufficient stock');
  });

  it('throws NotFound when product is missing', async () => {
    const { context, tx } = buildContext();
    tx.merchProduct.findUnique.mockResolvedValueOnce(null);
    await expect(
      orderMutations.createMerchOrder({}, { input: validInput }, context)
    ).rejects.toThrow('not found');
  });
});
