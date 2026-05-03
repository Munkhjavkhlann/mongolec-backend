import { checkPermission } from '@/auth';
import { AppError, ErrorType, type GraphQLContext } from '@/types';

export interface CreateParticipantInput {
  firstName: string;
  lastName: string;
  photo?: string;
  country: string;
  bio?: string;
  displayOrder?: number;
  isActive?: boolean;
  rallyYears?: number[];
}

export interface UpdateParticipantInput {
  firstName?: string;
  lastName?: string;
  photo?: string;
  country?: string;
  bio?: string;
  displayOrder?: number;
  isActive?: boolean;
  rallyYears?: number[];
}

export const participantMutations = {
  createParticipant: async (
    _: unknown,
    { input }: { input: CreateParticipantInput },
    context: GraphQLContext
  ) => {
    checkPermission(context, 'content:create');
    const tenantId = context.tenant?.id ?? context.user?.tenantId;
    if (!tenantId) throw new AppError('Tenant not found', ErrorType.TENANT_ERROR, 400);

    const count = await context.prisma.participant.count({ where: { tenantId } });

    const participant = await context.prisma.participant.create({
      data: {
        tenantId,
        firstName: input.firstName,
        lastName: input.lastName,
        photo: input.photo,
        country: input.country,
        bio: input.bio,
        displayOrder: input.displayOrder ?? count,
        isActive: input.isActive ?? true,
      },
    });

    if (input.rallyYears && input.rallyYears.length > 0) {
      await Promise.all(
        input.rallyYears.map(year =>
          context.prisma.participantRally.create({
            data: { participantId: participant.id, rallyId: `year-${year}`, year },
          })
        )
      );
    }

    const withRallies = await context.prisma.participant.findUnique({
      where: { id: participant.id },
      include: { rallies: true },
    });

    return {
      ...withRallies,
      rallyYears:
        withRallies?.rallies.map(r => r.year).filter((y): y is number => y !== null) ?? [],
    };
  },

  updateParticipant: async (
    _: unknown,
    { id, input }: { id: string; input: UpdateParticipantInput },
    context: GraphQLContext
  ) => {
    checkPermission(context, 'content:update');
    const tenantId = context.tenant?.id ?? context.user?.tenantId;
    const existing = await context.prisma.participant.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new AppError('Participant not found', ErrorType.NOT_FOUND, 404);

    const updated = await context.prisma.participant.update({
      where: { id },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(input.photo !== undefined && { photo: input.photo }),
        ...(input.country !== undefined && { country: input.country }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    if (input.rallyYears !== undefined) {
      await context.prisma.participantRally.deleteMany({ where: { participantId: id } });
      if (input.rallyYears.length > 0) {
        await Promise.all(
          input.rallyYears.map(year =>
            context.prisma.participantRally.create({
              data: { participantId: id, rallyId: `year-${year}`, year },
            })
          )
        );
      }
    }

    const withRallies = await context.prisma.participant.findUnique({
      where: { id: updated.id },
      include: { rallies: true },
    });

    return {
      ...withRallies,
      rallyYears:
        withRallies?.rallies.map(r => r.year).filter((y): y is number => y !== null) ?? [],
    };
  },

  deleteParticipant: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
    checkPermission(context, 'content:delete');
    const tenantId = context.tenant?.id ?? context.user?.tenantId;
    const existing = await context.prisma.participant.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new AppError('Participant not found', ErrorType.NOT_FOUND, 404);

    await context.prisma.participant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  },
};
