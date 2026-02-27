import { Prisma } from '@prisma/client';

export const nominationQueries = {
  // Get all nominations with filters
  nominations: async (_: any, args: any, context: any) => {
    const { page = 1, limit = 20, status, rallyId, search, orderBy = 'createdAt', orderDirection = 'desc' } = args;

    try {
      const where: Prisma.ParkNominationWhereInput = {
        tenantId: context.tenantId,
        deletedAt: null,
        ...(status && { status }),
        ...(rallyId && { rallyId }),
        ...(search && {
          OR: [
            { partnerOrganizationName: { contains: search, mode: 'insensitive' } },
            { partnerContactEmail: { contains: search, mode: 'insensitive' } },
            { parkContactEmail: { contains: search, mode: 'insensitive' } },
            { country: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      const [nominations, total] = await Promise.all([
        context.prisma.parkNomination.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { [orderBy]: orderDirection },
          include: {
            rally: {
              select: {
                id: true,
                slug: true,
                title: true,
                startDate: true,
                endDate: true,
                status: true,
              },
            },
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),
        context.prisma.parkNomination.count({ where }),
      ]);

      return {
        nominations,
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          perPage: limit,
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Error fetching nominations:', error);
      throw new Error('Failed to fetch nominations');
    }
  },

  // Get single nomination by ID
  nomination: async (_: any, args: any, context: any) => {
    const { id } = args;

    try {
      const nomination = await context.prisma.parkNomination.findFirst({
        where: { id, tenantId: context.tenantId, deletedAt: null },
        include: {
          rally: {
            select: {
              id: true,
              slug: true,
              title: true,
              startDate: true,
              endDate: true,
              status: true,
            },
          },
          tenant: true,
        },
      });

      if (!nomination) {
        throw new Error('Nomination not found');
      }

      return nomination;
    } catch (error) {
      if (error instanceof Error && error.message === 'Nomination not found') throw error;
      console.error('Error fetching nomination:', error);
      throw new Error('Failed to fetch nomination');
    }
  },

  // Get pending nominations
  pendingNominations: async (_: any, args: any, context: any) => {
    const { page = 1, limit = 20 } = args;

    try {
      const where: Prisma.ParkNominationWhereInput = {
        tenantId: context.tenantId,
        deletedAt: null,
        status: 'PENDING',
      };

      const [nominations, total] = await Promise.all([
        context.prisma.parkNomination.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'asc' },
          include: {
            rally: {
              select: {
                id: true,
                slug: true,
                title: true,
                startDate: true,
                status: true,
              },
            },
          },
        }),
        context.prisma.parkNomination.count({ where }),
      ]);

      return {
        nominations,
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          perPage: limit,
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Error fetching pending nominations:', error);
      throw new Error('Failed to fetch pending nominations');
    }
  },

  // Get approved nominations
  approvedNominations: async (_: any, args: any, context: any) => {
    const { page = 1, limit = 20, rallyId } = args;

    try {
      const where: Prisma.ParkNominationWhereInput = {
        tenantId: context.tenantId,
        deletedAt: null,
        status: 'APPROVED',
        ...(rallyId && { rallyId }),
      };

      const [nominations, total] = await Promise.all([
        context.prisma.parkNomination.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            rally: {
              select: {
                id: true,
                slug: true,
                title: true,
                startDate: true,
              },
            },
          },
        }),
        context.prisma.parkNomination.count({ where }),
      ]);

      return {
        nominations,
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          perPage: limit,
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Error fetching approved nominations:', error);
      throw new Error('Failed to fetch approved nominations');
    }
  },

  // Get nomination statistics
  nominationStats: async (_: any, args: any, context: any) => {
    const { rallyId } = args;

    try {
      const where: Prisma.ParkNominationWhereInput = {
        tenantId: context.tenantId,
        deletedAt: null,
        ...(rallyId && { rallyId }),
      };

      const [
        totalNominations,
        pendingNominations,
        approvedNominations,
        rejectedNominations,
        uniqueCountries,
      ] = await Promise.all([
        context.prisma.parkNomination.count({ where }),
        context.prisma.parkNomination.count({ where: { ...where, status: 'PENDING' } }),
        context.prisma.parkNomination.count({ where: { ...where, status: 'APPROVED' } }),
        context.prisma.parkNomination.count({ where: { ...where, status: 'REJECTED' } }),
        context.prisma.parkNomination.groupBy({
          by: ['country'],
          where,
        }).then(groups => groups.length),
      ]);

      const approvalRate = totalNominations > 0
        ? Math.round((approvedNominations / totalNominations) * 100)
        : 0;

      return {
        totalNominations,
        pendingNominations,
        approvedNominations,
        rejectedNominations,
        uniqueCountryCount: uniqueCountries,
        approvalRate,
      };
    } catch (error) {
      console.error('Error fetching nomination stats:', error);
      throw new Error('Failed to fetch nomination stats');
    }
  },

  // Check if email has already nominated a park for a rally
  hasNominated: async (_: any, args: any, context: any) => {
    const { rallyId, email } = args;

    try {
      const nomination = await context.prisma.parkNomination.findFirst({
        where: {
          rallyId,
          nominatorEmail: email.toLowerCase(),
          tenantId: context.tenantId,
          deletedAt: null,
        },
      });

      return !!nomination;
    } catch (error) {
      console.error('Error checking nomination:', error);
      return false;
    }
  },
};
