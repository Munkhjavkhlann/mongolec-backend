import { Prisma } from '@prisma/client';

export const partnershipQueries = {
  // Get all partnerships with filters
  getParkPartnerships: async (_: any, args: any, context: any) => {
    const { rallyId, country, status, page = 1, limit = 20, orderBy = 'createdAt', orderDirection = 'desc' } = args;

    try {
      const where: Prisma.ParkPartnershipWhereInput = {
        tenantId: context.tenant?.id,
        deletedAt: null,
        ...(rallyId && { rallyId }),
        ...(country && { country }),
        ...(status && { status }),
      };

      const partnerships = await context.prisma.parkPartnership.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderBy]: orderDirection },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      return partnerships;
    } catch (error) {
      console.error('Error fetching park partnerships:', error);
      throw new Error('Failed to fetch park partnerships');
    }
  },

  // Get single partnership by ID
  getParkPartnership: async (_: any, args: any, context: any) => {
    const { id } = args;

    try {
      const partnership = await context.prisma.parkPartnership.findFirst({
        where: { id, tenantId: context.tenant?.id, deletedAt: null },
        include: {
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
  getPartnershipStats: async (_: any, args: any, context: any) => {
    const { rallyId } = args;

    try {
      const where: Prisma.ParkPartnershipWhereInput = {
        tenantId: context.tenant?.id,
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
        context.prisma.parkPartnership.count({ where: { ...where, status: 'ACTIVE' } }),
        context.prisma.parkPartnership.count({ where: { ...where, status: 'PROSPECTIVE' } }),
        context.prisma.parkPartnership.count({ where: { ...where, status: 'CONFIRMED' } }),
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
