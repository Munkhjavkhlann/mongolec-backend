import { checkPermission } from '@/auth';
import { AppError, ErrorType, type GraphQLContext } from '@/types';

export interface CreateRangerInput {
  name: string;
  photo?: string;
  parkName: string;
  country: string;
  bio?: string;
  displayOrder?: number;
  isActive?: boolean;
  rallyId?: string;
}

export interface UpdateRangerInput {
  name?: string;
  photo?: string;
  parkName?: string;
  country?: string;
  bio?: string;
  displayOrder?: number;
  isActive?: boolean;
  rallyId?: string;
}

export const rangerMutations = {
  createRanger: async (
    _: unknown,
    { input }: { input: CreateRangerInput },
    context: GraphQLContext
  ) => {
    checkPermission(context, 'content:create');
    const tenantId = context.tenant?.id ?? context.user?.tenantId;
    if (!tenantId) throw new AppError('Tenant not found', ErrorType.TENANT_ERROR, 400);

    const count = await context.prisma.ranger.count({ where: { tenantId } });

    return context.prisma.ranger.create({
      data: {
        tenantId,
        name: input.name,
        photo: input.photo,
        parkName: input.parkName,
        country: input.country,
        bio: input.bio,
        displayOrder: input.displayOrder ?? count,
        isActive: input.isActive ?? true,
        rallyId: input.rallyId,
      },
    });
  },

  updateRanger: async (
    _: unknown,
    { id, input }: { id: string; input: UpdateRangerInput },
    context: GraphQLContext
  ) => {
    checkPermission(context, 'content:update');
    const tenantId = context.tenant?.id ?? context.user?.tenantId;
    const existing = await context.prisma.ranger.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new AppError('Ranger not found', ErrorType.NOT_FOUND, 404);

    return context.prisma.ranger.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.photo !== undefined && { photo: input.photo }),
        ...(input.parkName !== undefined && { parkName: input.parkName }),
        ...(input.country !== undefined && { country: input.country }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.rallyId !== undefined && { rallyId: input.rallyId }),
      },
    });
  },

  deleteRanger: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
    checkPermission(context, 'content:delete');
    const tenantId = context.tenant?.id ?? context.user?.tenantId;
    const existing = await context.prisma.ranger.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new AppError('Ranger not found', ErrorType.NOT_FOUND, 404);

    await context.prisma.ranger.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  },
};
