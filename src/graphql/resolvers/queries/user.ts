import { GraphQLContext } from '@/types';
import { createLogger } from '@/utils/logger';
import { checkPermission, assertTenantAccess } from '@/auth';

const logger = createLogger('USER_QUERIES');

/**
 * User Query Resolvers
 * Handles user queries including admin dashboard queries
 */
export const userQueries = {
  /**
   * Get pending users (awaiting admin approval)
   * Requires admin permission
   */
  getPendingUsers: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      // Check admin permission
      checkPermission(context, 'user:read');

      const { page = 1, limit = 20, search } = args;
      const tenantId = assertTenantAccess(context);

      const where: any = {
        tenantId,
        isActive: false,
        approvedAt: null,
        deletedAt: null,
      };

      // Optional search
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        context.prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            tenant: true,
            roles: {
              include: {
                role: true,
              },
            },
          },
        }),
        context.prisma.user.count({ where }),
      ]);

      return {
        users: users.map(user => ({
          ...user,
          password: undefined,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          perPage: limit,
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      logger.error('Failed to fetch pending users', error as Error);
      throw error;
    }
  },

  /**
   * Get rejected users
   * Requires admin permission
   */
  getRejectedUsers: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      // Check admin permission
      checkPermission(context, 'user:read');

      const { page = 1, limit = 20 } = args;
      const tenantId = assertTenantAccess(context);

      const where = {
        tenantId,
        rejectedAt: { not: null },
        deletedAt: null,
      };

      const [users, total] = await Promise.all([
        context.prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { rejectedAt: 'desc' },
          include: {
            tenant: true,
            roles: {
              include: {
                role: true,
              },
            },
          },
        }),
        context.prisma.user.count({ where }),
      ]);

      return {
        users: users.map(user => ({
          ...user,
          password: undefined,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          perPage: limit,
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      logger.error('Failed to fetch rejected users', error as Error);
      throw error;
    }
  },

  /**
   * Get user approval statistics for admin dashboard
   * Requires admin permission
   */
  getUserApprovalStats: async (_parent: any, _args: any, context: GraphQLContext) => {
    try {
      // Check admin permission
      checkPermission(context, 'user:read');

      const tenantId = assertTenantAccess(context);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [
        totalUsers,
        activeUsers,
        pendingUsers,
        rejectedUsers,
        inactiveUsers,
        recentRegistrations,
      ] = await Promise.all([
        context.prisma.user.count({ where: { tenantId, deletedAt: null } }),
        context.prisma.user.count({ where: { tenantId, isActive: true, deletedAt: null } }),
        context.prisma.user.count({
          where: { tenantId, isActive: false, approvedAt: null, rejectedAt: null, deletedAt: null },
        }),
        context.prisma.user.count({
          where: { tenantId, rejectedAt: { not: null }, deletedAt: null },
        }),
        context.prisma.user.count({
          where: { tenantId, isActive: false, approvedAt: { not: null }, deletedAt: null },
        }),
        context.prisma.user.count({
          where: { tenantId, createdAt: { gte: sevenDaysAgo }, deletedAt: null },
        }),
      ]);

      return {
        totalUsers,
        activeUsers,
        pendingUsers,
        rejectedUsers,
        inactiveUsers,
        recentRegistrations,
        approvalRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
      };
    } catch (error) {
      logger.error('Failed to fetch user approval stats', error as Error);
      throw error;
    }
  },

  /**
   * Get user by ID (for admin view)
   * Requires admin permission
   */
  getUser: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      // Check admin permission
      checkPermission(context, 'user:read');

      const tenantId = assertTenantAccess(context);
      const { id } = args;

      const user = await context.prisma.user.findFirst({
        where: { id, tenantId },
        include: {
          tenant: true,
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        ...user,
        password: undefined,
      };
    } catch (error) {
      logger.error('Failed to fetch user', error as Error);
      throw error;
    }
  },

  /**
   * Get all users (with filters)
   * Requires admin permission
   */
  getUsers: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      // Check admin permission
      checkPermission(context, 'user:read');

      const {
        page = 1,
        limit = 20,
        search,
        status,
        orderBy = 'createdAt',
        orderDirection = 'desc',
      } = args;
      const safeLimit = Math.min(Math.max(1, limit), 100);
      const ALLOWED_ORDER_FIELDS = new Set([
        'createdAt',
        'email',
        'firstName',
        'lastName',
        'lastLoginAt',
      ]);
      const safeOrderBy = ALLOWED_ORDER_FIELDS.has(orderBy) ? orderBy : 'createdAt';
      const safeDirection = orderDirection === 'asc' ? 'asc' : 'desc';
      const tenantId = assertTenantAccess(context);

      const where: any = {
        tenantId,
        deletedAt: null,
      };

      // Status filter
      if (status === 'ACTIVE') {
        where.isActive = true;
      } else if (status === 'PENDING') {
        where.isActive = false;
        where.approvedAt = null;
        where.rejectedAt = null;
      } else if (status === 'REJECTED') {
        where.rejectedAt = { not: null };
      } else if (status === 'INACTIVE') {
        where.isActive = false;
        where.approvedAt = { not: null };
      }

      // Search filter
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        context.prisma.user.findMany({
          where,
          skip: (page - 1) * safeLimit,
          take: safeLimit,
          orderBy: { [safeOrderBy]: safeDirection },
          include: {
            tenant: true,
            roles: {
              include: {
                role: true,
              },
            },
          },
        }),
        context.prisma.user.count({ where }),
      ]);

      return {
        users: users.map(user => ({
          ...user,
          password: undefined,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          perPage: limit,
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      logger.error('Failed to fetch users', error as Error);
      throw error;
    }
  },
};
