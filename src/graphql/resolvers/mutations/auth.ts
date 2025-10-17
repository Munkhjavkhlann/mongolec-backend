import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GraphQLContext } from '@/types';
import { createLogger } from '@/utils/logger';

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
  login: async (_parent: any, args: any, context: GraphQLContext) => {
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
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Check if tenant is active
      if (user.tenant.status !== 'ACTIVE') {
        throw new Error('Account is suspended');
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          tenantId: user.tenantId,
        } as JWTPayload,
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
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
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      logger.info(`User logged in: ${user.email}`);

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
  register: async (_parent: any, args: any, context: GraphQLContext) => {
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
        throw new Error('Organization not found');
      }

      // Check if user already exists
      const existingUser = await context.prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          tenantId: tenant.id,
        },
      });

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await context.prisma.user.create({
        data: {
          email: email.toLowerCase(),
          firstName,
          lastName,
          password: hashedPassword,
          tenantId: tenant.id,
          isActive: true,
        },
        include: {
          tenant: true,
        },
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          tenantId: user.tenantId,
        } as JWTPayload,
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
      );

      // Set httpOnly cookie
      context.res.cookie('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      logger.info(`User registered: ${user.email}`);

      return {
        success: true,
        message: 'Registration successful',
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
  logout: async (_parent: any, _args: any, context: GraphQLContext) => {
    try {
      context.res.clearCookie('auth-token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      logger.info('User logged out successfully');

      return true;
    } catch (error) {
      logger.error('Logout failed', error as Error);
      throw new Error('Logout failed');
    }
  },
};
