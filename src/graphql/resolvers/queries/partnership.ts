import { Prisma } from '@prisma/client';

export const partnershipQueries = {
  // Get all partnerships with filters
  parkPartnerships: async (_: any, args: any, context: any) => {
    const { rallyId, country, partnershipStatus, page = 1, limit = 20, orderBy = 'createdAt', orderDirection = 'desc' } = args;

    try {
      const where: Prisma.ParkPartnershipWhereInput = {
        tenantId: context.tenantId,
        deletedAt: null,
        ...(rallyId && { rallyId }),
        ...(country && { country }),
        ...(partnershipStatus && { partnershipStatus }),
      };

      const [partnerships, total] = await Promise.all([
        context.prisma.parkPartnership.findMany({
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
        context.prisma.parkPartnership.count({ where }),
      ]);

      return {
        partnerships,
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
      console.error('Error fetching park partnerships:', error);
      throw new Error('Failed to fetch park partnerships');
    }
  },

  // Get single partnership by ID
  parkPartnership: async (_: any, args: any, context: any) => {
    const { id } = args;

    try {
      const partnership = await context.prisma.parkPartnership.findFirst({
        where: { id, tenantId: context.tenantId, deletedAt: null },
        include: {
          rally: {
            select: {
              id: true,
              slug: true,
              title: true,
              startDate: true,
              endDate: true,
            },
          },
          tenant: true,
        },
      });

      if (!partnership) {
        throw new Error('Park partnership not found');
      }

      return partnership;
    } catch (error) {
      if (error instanceof Error && error.message === 'Park partnership not found') throw error;
      console.error('Error fetching park partnership:', error);
      throw new Error('Failed to fetch park partnership');
    }
  },

  // Get partnership statistics
  partnershipStats: async (_: any, args: any, context: any) => {
    const { rallyId } = args;

    try {
      const where: Prisma.ParkPartnershipWhereInput = {
        tenantId: context.tenantId,
        deletedAt: null,
        ...(rallyId && { rallyId }),
      };

      const [
        totalPartnerships,
        activePartnerships,
        prospectivePartnerships,
        confirmedPartnerships,
        uniqueCountries,
      ] = await Promise.all([
        context.prisma.parkPartnership.count({ where }),
        context.prisma.parkPartnership.count({ where: { ...where, partnershipStatus: 'ACTIVE' } }),
        context.prisma.parkPartnership.count({ where: { ...where, partnershipStatus: 'PROSPECTIVE' } }),
        context.prisma.parkPartnership.count({ where: { ...where, partnershipStatus: 'CONFIRMED' } }),
        context.prisma.parkPartnership.groupBy({
          by: ['country'],
          where,
        }).then(groups => groups.length),
      ]);

      return {
        totalPartnerships,
        activePartnerships,
        prospectivePartnerships,
        confirmedPartnerships,
        uniqueCountryCount: uniqueCountries,
      };
    } catch (error) {
      console.error('Error fetching partnership stats:', error);
      throw new Error('Failed to fetch partnership stats');
    }
  },
};
