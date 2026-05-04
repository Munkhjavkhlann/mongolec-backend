import { checkPermission } from '@/auth';
import { AppError, ErrorType, type GraphQLContext } from '@/types';

export const rangerQueries = {
  getRangers: async (
    _: unknown,
    { limit = 20, page = 1, isActive }: { limit?: number; page?: number; isActive?: boolean },
    context: GraphQLContext
  ) => {
    // Public read — no auth required; admin write operations are protected separately
    const tenantId = context.tenant?.id ?? context.user?.tenantId;
    if (!tenantId)
      return {
        rangers: [],
        pagination: {
          total: 0,
          totalPages: 0,
          currentPage: page,
          perPage: limit,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

    const safePage = Math.max(page || 1, 1);
    const safeLimit = Math.min(Math.max(limit || 20, 1), 100);

    const where = {
      tenantId,
      deletedAt: null,
      ...(isActive !== undefined && { isActive }),
    };

    const [rangers, total] = await Promise.all([
      context.prisma.ranger.findMany({
        where,
        orderBy: { displayOrder: 'asc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      context.prisma.ranger.count({ where }),
    ]);

    const totalPages = Math.ceil(total / safeLimit);

    return {
      rangers,
      pagination: {
        total,
        totalPages,
        currentPage: safePage,
        perPage: safeLimit,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
      },
    };
  },

  getRanger: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
    const tenantId = context.tenant?.id ?? context.user?.tenantId;
    if (!tenantId) return null;
    return context.prisma.ranger.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  },
};
