import { Prisma } from '@prisma/client';

export const storyQueries = {
  // Get all stories with filters
  stories: async (_: any, args: any, context: any) => {
    const { page = 1, limit = 20, status, type, rallyId, search, orderBy = 'createdAt', orderDirection = 'desc' } = args;

    try {
      const where: Prisma.StoryWhereInput = {
        tenantId: context.tenantId,
        deletedAt: null,
        ...(status && { status }),
        ...(type && { type }),
        ...(rallyId && { rallyId }),
        ...(search && {
          OR: [
            { slug: { contains: search, mode: 'insensitive' } },
            { featuredImage: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      const [stories, total] = await Promise.all([
        context.prisma.story.findMany({
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
              },
            },
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
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
        context.prisma.story.count({ where }),
      ]);

      return {
        stories,
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
      console.error('Error fetching stories:', error);
      throw new Error('Failed to fetch stories');
    }
  },

  // Get single story by slug or ID
  story: async (_: any, args: any, context: any) => {
    const { slug, id } = args;

    if (!slug && !id) {
      throw new Error('Either slug or id must be provided');
    }

    try {
      const story = await context.prisma.story.findFirst({
        where: {
          tenantId: context.tenantId,
          deletedAt: null,
          ...(slug && { slug }),
          ...(id && { id }),
        },
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
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          tenant: true,
        },
      });

      if (!story) {
        throw new Error('Story not found');
      }

      return story;
    } catch (error) {
      if (error instanceof Error && error.message === 'Story not found') throw error;
      console.error('Error fetching story:', error);
      throw new Error('Failed to fetch story');
    }
  },

  // Get published stories (public)
  publishedStories: async (_: any, args: any, context: any) => {
    const { page = 1, limit = 20, type, rallyId } = args;

    try {
      const where: Prisma.StoryWhereInput = {
        tenantId: context.tenantId,
        deletedAt: null,
        status: 'PUBLISHED',
        ...(type && { type }),
        ...(rallyId && { rallyId }),
      };

      const [stories, total] = await Promise.all([
        context.prisma.story.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { publishedAt: 'desc' },
          include: {
            rally: {
              select: {
                id: true,
                slug: true,
                title: true,
                startDate: true,
              },
            },
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        context.prisma.story.count({ where }),
      ]);

      return {
        stories,
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
      console.error('Error fetching published stories:', error);
      throw new Error('Failed to fetch published stories');
    }
  },

  // Get featured stories (public)
  featuredStories: async (_: any, args: any, context: any) => {
    const { limit = 6 } = args;

    try {
      return await context.prisma.story.findMany({
        where: {
          tenantId: context.tenantId,
          deletedAt: null,
          status: 'PUBLISHED',
          isFeatured: true,
        },
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          rally: {
            select: {
              id: true,
              slug: true,
              title: true,
            },
          },
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Error fetching featured stories:', error);
      throw new Error('Failed to fetch featured stories');
    }
  },

  // Get impact stories (public)
  impactStories: async (_: any, args: any, context: any) => {
    const { page = 1, limit = 20 } = args;

    try {
      const where: Prisma.StoryWhereInput = {
        tenantId: context.tenantId,
        deletedAt: null,
        status: 'PUBLISHED',
        type: 'IMPACT',
      };

      const [stories, total] = await Promise.all([
        context.prisma.story.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { publishedAt: 'desc' },
          include: {
            rally: {
              select: {
                id: true,
                slug: true,
                title: true,
              },
            },
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        context.prisma.story.count({ where }),
      ]);

      return {
        stories,
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
      console.error('Error fetching impact stories:', error);
      throw new Error('Failed to fetch impact stories');
    }
  },

  // Get draft stories (admin only)
  draftStories: async (_: any, args: any, context: any) => {
    const { page = 1, limit = 20 } = args;

    // Check authentication
    if (!context.user) {
      throw new Error('Authentication required');
    }

    // Check permissions
    const hasPermission = context.user.permissions?.some((p: any) =>
      p.resource === 'story' && p.action === 'manage'
    );

    if (!hasPermission) {
      throw new Error('Permission denied: story:manage required');
    }

    try {
      const where: Prisma.StoryWhereInput = {
        tenantId: context.tenantId,
        deletedAt: null,
        status: 'DRAFT',
      };

      const [stories, total] = await Promise.all([
        context.prisma.story.findMany({
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
              },
            },
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        context.prisma.story.count({ where }),
      ]);

      return {
        stories,
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
      console.error('Error fetching draft stories:', error);
      throw new Error('Failed to fetch draft stories');
    }
  },

  // Get story statistics
  storyStats: async (_: any, args: any, context: any) => {
    const { rallyId } = args;

    // Check authentication
    if (!context.user) {
      throw new Error('Authentication required');
    }

    // Check permissions
    const hasPermission = context.user.permissions?.some((p: any) =>
      p.resource === 'story' && p.action === 'manage'
    );

    if (!hasPermission) {
      throw new Error('Permission denied: story:manage required');
    }

    try {
      const where: Prisma.StoryWhereInput = {
        tenantId: context.tenantId,
        deletedAt: null,
        ...(rallyId && { rallyId }),
      };

      const [
        totalStories,
        publishedStories,
        draftStories,
        featuredStories,
        impactStories,
        riderStories,
        rallyStories,
      ] = await Promise.all([
        context.prisma.story.count({ where }),
        context.prisma.story.count({ where: { ...where, status: 'PUBLISHED' } }),
        context.prisma.story.count({ where: { ...where, status: 'DRAFT' } }),
        context.prisma.story.count({ where: { ...where, isFeatured: true } }),
        context.prisma.story.count({ where: { ...where, type: 'IMPACT' } }),
        context.prisma.story.count({ where: { ...where, type: 'RIDER' } }),
        context.prisma.story.count({ where: { ...where, type: 'RALLY' } }),
      ]);

      return {
        totalStories,
        publishedStories,
        draftStories,
        featuredStories,
        impactStories,
        riderStories,
        rallyStories,
      };
    } catch (error) {
      console.error('Error fetching story stats:', error);
      throw new Error('Failed to fetch story stats');
    }
  },
};
