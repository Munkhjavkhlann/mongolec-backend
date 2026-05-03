import { Prisma } from '@prisma/client';

export const mediaQueries = {
  // Get all media with filters
  getRallyMedia: async (_: any, args: any, context: any) => {
    const { rallyId, type, orderBy = 'displayOrder', orderDirection = 'asc' } = args;

    try {
      const where: Prisma.RallyMediaWhereInput = {
        tenantId: context.tenant?.id,
        deletedAt: null,
        ...(rallyId && { rallyId }),
        ...(type && { type }),
      };

      const media = await context.prisma.rallyMedia.findMany({
        where,
        orderBy: { [orderBy]: orderDirection },
        include: {
          rally: {
            select: {
              id: true,
              slug: true,
              title: true,
            },
          },
        },
      });

      return media;
    } catch (error) {
      console.error('Error fetching rally media:', error);
      throw new Error('Failed to fetch rally media');
    }
  },

  // Get single media by ID
  getMedia: async (_: any, args: any, context: any) => {
    const { id } = args;

    try {
      const media = await context.prisma.rallyMedia.findFirst({
        where: { id, tenantId: context.tenant?.id, deletedAt: null },
        include: {
          rally: {
            select: {
              id: true,
              slug: true,
              title: true,
            },
          },
        },
      });

      if (!media) {
        throw new Error('Media not found');
      }

      return media;
    } catch (error) {
      if (error instanceof Error && error.message === 'Media not found') throw error;
      console.error('Error fetching media:', error);
      throw new Error('Failed to fetch media');
    }
  },
};
