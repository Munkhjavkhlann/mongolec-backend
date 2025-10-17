import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface JWTPayload {
  id: string;
  email: string;
  tenantId: string;
}

/**
 * GraphQL resolvers for authentication functionality
 * Handles user login, registration, and user info retrieval
 */
export const authResolvers = {
  Tenant: {
    // Map database status field to GraphQL isActive field
    isActive: (parent: any) => parent.status === 'ACTIVE',
  },

  Query: {
    /**
     * Get current authenticated user
     */
    me: async (_parent: any, _args: any, context: any) => {
      // Return null if not authenticated (don't throw error)
      if (!context.user) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { id: context.user.id },
        include: {
          tenant: true,
        },
      });

      return user;
    },

    /**
     * Get list of available tenants for registration
     */
    tenants: async () => {
      try {
        const tenants = await prisma.tenant.findMany({
          where: {
            status: 'ACTIVE',
          },
          orderBy: { name: 'asc' },
        });

        return tenants;
      } catch (error) {
        logger.error('Error fetching tenants:', error);
        throw new Error('Failed to fetch tenants');
      }
    },
  },

  Mutation: {
    /**
     * User login with email and password
     */
    login: async (_parent: any, args: any, context: any) => {
      try {
        const { email, password } = args;

        // Find user by email
        const user = await prisma.user.findFirst({
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
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Set httpOnly cookie instead of returning token
        context.res.cookie('auth-token', token, {
          httpOnly: true, // Not accessible via JavaScript
          secure: process.env.NODE_ENV === 'production', // HTTPS only in production
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // CSRF protection - lax for development
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/',
        });

        logger.info(`User logged in: ${user.email}`);

        return {
          success: true,
          message: 'Login successful',
          user: {
            ...user,
            password: undefined, // Remove password from response
          },
        };
      } catch (error) {
        logger.error('Login failed:', error);
        throw error;
      }
    },

    /**
     * User registration
     */
    register: async (_parent: any, args: any, context: any) => {
      try {
        const { email, password, firstName, lastName, tenantSlug } = args;

        // Find tenant by slug
        const tenant = await prisma.tenant.findFirst({
          where: {
            slug: tenantSlug,
            status: 'ACTIVE',
          },
        });

        if (!tenant) {
          throw new Error('Organization not found');
        }

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
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
        const user = await prisma.user.create({
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

        // Set httpOnly cookie instead of returning token
        context.res.cookie('auth-token', token, {
          httpOnly: true, // Not accessible via JavaScript
          secure: process.env.NODE_ENV === 'production', // HTTPS only in production
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // CSRF protection - lax for development
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/',
        });

        logger.info(`User registered: ${user.email}`);

        return {
          success: true,
          message: 'Registration successful',
          user: {
            ...user,
            password: undefined, // Remove password from response
          },
        };
      } catch (error) {
        logger.error('Registration failed:', error);
        throw error;
      }
    },

    /**
     * User logout - clears the httpOnly cookie
     */
    logout: async (_parent: any, _args: any, context: any) => {
      try {
        // Clear the httpOnly cookie
        context.res.clearCookie('auth-token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
        });

        logger.info('User logged out successfully');

        return {
          success: true,
          message: 'Logged out successfully',
        };
      } catch (error) {
        logger.error('Logout failed:', error);
        throw new Error('Logout failed');
      }
    },
  },
};
