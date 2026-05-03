import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GraphQLContext } from '@/types';
import { createLogger } from '@/utils/logger';
import { hashEmail } from '@/utils';
import { AuthenticationError, NotFoundError, ValidationError, ConflictError } from '@/utils/errors';
import type { LoginArgs, RegisterArgs } from '@/graphql/types/args';
import { redisClient } from '@/database/redis';

const logger = createLogger('AUTH_MUTATIONS');

interface JWTPayload {
  id: string;
  email: string;
  tenantId: string;
}

/**
 * Auth Mutation Resolvers
 * Handles user login, registration, and logout
 */
export const authMutations = {
  /**
   * User login with email and password
   */
  login: async (_parent: unknown, args: LoginArgs, context: GraphQLContext) => {
    try {
      const { email, password } = args;

      // Find user by email
      const user = await context.prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          isActive: true,
        },
        include: {
          tenant: true,
        },
      });

      if (!user) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Check if tenant is active
      if (user.tenant.status !== 'ACTIVE') {
        throw new AuthenticationError('Account is suspended');
      }

      const JWT_EXPIRY_SECONDS = 24 * 60 * 60; // 24h — keep cookie and token lifetime in sync

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          tenantId: user.tenantId,
        } as JWTPayload,
        process.env.JWT_SECRET!,
        { expiresIn: JWT_EXPIRY_SECONDS } as jwt.SignOptions
      );

      // Update last login
      await context.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Set httpOnly cookie instead of returning token
      context.res.cookie('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: JWT_EXPIRY_SECONDS * 1000,
        path: '/',
        // Share cookie across all subdomains (e.g. admin.mongolec.org reads it server-side)
        domain: process.env.COOKIE_DOMAIN || undefined,
      });

      logger.info(`User logged in: ${hashEmail(user.email)}`);

      return {
        success: true,
        message: 'Login successful',
        user: {
          ...user,
          password: undefined,
        },
      };
    } catch (error) {
      logger.error('Login failed', error as Error);
      throw error;
    }
  },

  /**
   * User registration
   */
  register: async (_parent: unknown, args: RegisterArgs, context: GraphQLContext) => {
    try {
      const { email, password, firstName, lastName, tenantSlug } = args;

      // Find tenant by slug
      const tenant = await context.prisma.tenant.findFirst({
        where: {
          slug: tenantSlug,
          status: 'ACTIVE',
        },
      });

      if (!tenant) {
        throw new NotFoundError('Organization');
      }

      // Check if user already exists
      const existingUser = await context.prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          tenantId: tenant.id,
        },
      });

      if (existingUser) {
        throw new ConflictError('User already exists with this email');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user (inactive, requires admin approval)
      const user = await context.prisma.user.create({
        data: {
          email: email.toLowerCase(),
          firstName,
          lastName,
          password: hashedPassword,
          tenantId: tenant.id,
          isActive: false, // Requires admin approval
        },
        include: {
          tenant: true,
        },
      });

      logger.info(`User registered (pending approval): ${hashEmail(user.email)}`);

      return {
        success: true,
        message: 'Registration successful. Your account is pending admin approval.',
        user: {
          ...user,
          password: undefined,
        },
      };
    } catch (error) {
      logger.error('Registration failed', error as Error);
      throw error;
    }
  },

  /**
   * User logout - clears the httpOnly cookie
   */
  logout: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
    // Invalidate Redis auth cache so the next login triggers a fresh DB lookup
    if (context.user?.id) {
      await redisClient.del(`auth:user:${context.user.id}`);
    }

    context.res.clearCookie('auth-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    logger.info('User logged out successfully', { userId: context.user?.id });

    return true;
  },
};
