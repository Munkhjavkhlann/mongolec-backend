import { GraphQLContext } from '@/types';
import { createLogger } from '@/utils/logger';
import { hashEmail } from '@/utils';
import {
  authenticated,
  withPermission
} from '@/graphql/decorators/auth';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthorizationError
} from '@/utils/errors';
import type {
  ApproveUserArgs,
  RejectUserArgs,
  UpdateUserArgs
} from '@/graphql/types/args';

const logger = createLogger('USER_MUTATIONS');

// Permission constants
const PERMISSIONS = {
  MANAGE_USER: 'user:manage',
} as const;

/**
 * User Management Mutation Resolvers
 * Handles admin approval, rejection, and user management
 */
export const userMutations = {
  /**
   * Approve a pending user registration
   * Requires admin permission
   */
  approveUser: withPermission(PERMISSIONS.MANAGE_USER)(authenticated(
    async (_parent: unknown, args: ApproveUserArgs, context: GraphQLContext) => {
      const { userId } = args;

      // Get user to approve
      const user = await context.prisma.user.findUnique({
        where: { id: userId },
        include: { tenant: true },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      // Check if already approved
      if (user.isActive) {
        throw new ConflictError('User is already active');
      }

      // Check if user is in the same tenant as admin
      if (context.user.tenantId !== user.tenantId) {
        throw new AuthorizationError('user:manage', 'You can only approve users in your tenant');
      }

      // Approve user
      const approvedUser = await context.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: true,
          approvedAt: new Date(),
          approvedBy: context.user.id,
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null,
        },
        include: { tenant: true },
      });

      logger.info(`User approved: ${hashEmail(approvedUser.email)} by ${hashEmail(context.user.email)}`);

      return {
        success: true,
        message: 'User approved successfully',
        user: {
          ...approvedUser,
          password: undefined,
        },
      };
    }
  )),

  /**
   * Reject a pending user registration
   * Requires admin permission
   */
  rejectUser: withPermission(PERMISSIONS.MANAGE_USER)(authenticated(
    async (_parent: unknown, args: RejectUserArgs, context: GraphQLContext) => {
      const { userId, reason } = args;

      // Get user to reject
      const user = await context.prisma.user.findUnique({
        where: { id: userId },
        include: { tenant: true },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      // Check if already rejected
      if (user.rejectedAt) {
        throw new ConflictError('User is already rejected');
      }

      // Check if user is in the same tenant as admin
      if (context.user.tenantId !== user.tenantId) {
        throw new AuthorizationError('user:manage', 'You can only reject users in your tenant');
      }

      // Reject user (keep inactive)
      const rejectedUser = await context.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          rejectedAt: new Date(),
          rejectedBy: context.user.id,
          rejectionReason: reason || 'No reason provided',
          approvedAt: null,
          approvedBy: null,
        },
        include: { tenant: true },
      });

      logger.info(`User rejected: ${hashEmail(rejectedUser.email)} by ${hashEmail(context.user.email)}`, { reason });

      return {
        success: true,
        message: 'User rejected successfully',
        user: {
          ...rejectedUser,
          password: undefined,
        },
      };
    }
  )),

  /**
   * Activate a rejected user (give them another chance)
   * Requires admin permission
   */
  activateUser: withPermission(PERMISSIONS.MANAGE_USER)(authenticated(
    async (_parent: unknown, args: ApproveUserArgs, context: GraphQLContext) => {
      const { userId } = args;

      // Get user to activate
      const user = await context.prisma.user.findUnique({
        where: { id: userId },
        include: { tenant: true },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      // Check if user is in the same tenant as admin
      if (context.user.tenantId !== user.tenantId) {
        throw new AuthorizationError('user:manage', 'You can only activate users in your tenant');
      }

      // Activate user
      const activatedUser = await context.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: true,
          approvedAt: new Date(),
          approvedBy: context.user.id,
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null,
        },
        include: { tenant: true },
      });

      logger.info(`User activated: ${hashEmail(activatedUser.email)} by ${hashEmail(context.user.email)}`);

      return {
        success: true,
        message: 'User activated successfully',
        user: {
          ...activatedUser,
          password: undefined,
        },
      };
    }
  )),

  /**
   * Deactivate a user (temporary disable)
   * Requires admin permission
   */
  deactivateUser: withPermission(PERMISSIONS.MANAGE_USER)(authenticated(
    async (_parent: unknown, args: RejectUserArgs, context: GraphQLContext) => {
      const { userId, reason } = args;

      // Get user to deactivate
      const user = await context.prisma.user.findUnique({
        where: { id: userId },
        include: { tenant: true },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      // Can't deactivate yourself
      if (userId === context.user.id) {
        throw new ValidationError('You cannot deactivate your own account');
      }

      // Check if user is in the same tenant as admin
      if (context.user.tenantId !== user.tenantId) {
        throw new AuthorizationError('user:manage', 'You can only deactivate users in your tenant');
      }

      // Deactivate user
      const deactivatedUser = await context.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
        },
        include: { tenant: true },
      });

      logger.info(`User deactivated: ${hashEmail(deactivatedUser.email)} by ${hashEmail(context.user.email)}`, { reason });

      return {
        success: true,
        message: 'User deactivated successfully',
        user: {
          ...deactivatedUser,
          password: undefined,
        },
      };
    }
  )),
};
