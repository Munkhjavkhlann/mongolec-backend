import { checkPermission } from '@/auth';
import { AppError, ErrorType, type GraphQLContext } from '@/types';

export const participantQueries = {
  getParticipants: async (
    _: unknown,
    { limit = 20, page = 1, isActive }: { limit?: number; page?: number; isActive?: boolean },
    context: GraphQLContext
  ) => {
    checkPermission(context, 'content:read');
    const tenantId = context.tenant?.id ?? context.user?.tenantId;
    if (!tenantId)
      return {
        participants: [],
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

    const [rawParticipants, total] = await Promise.all([
      context.prisma.participant.findMany({
        where,
        include: { rallies: true },
        orderBy: { displayOrder: 'asc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      context.prisma.participant.count({ where }),
    ]);

    const totalPages = Math.ceil(total / safeLimit);

    const participants = rawParticipants.map(p => ({
      ...p,
      rallyYears: p.rallies.map(r => r.year).filter((y): y is number => y !== null),
    }));

    return {
      participants,
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

  getParticipant: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
    checkPermission(context, 'content:read');
    const tenantId = context.tenant?.id ?? context.user?.tenantId;
    if (!tenantId) return null;

    const participant = await context.prisma.participant.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { rallies: true },
    });

    if (!participant) return null;

    return {
      ...participant,
      rallyYears: participant.rallies.map(r => r.year).filter((y): y is number => y !== null),
    };
  },
};
