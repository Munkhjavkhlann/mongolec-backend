import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { authenticate, requireAuth } from '../src/auth/auth.middleware';
import { AppError } from '../src/types';

describe('Authentication Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(cookieParser());
    app.use(express.json());
  });

  describe('authenticate', () => {
    it('should pass without user when no token is provided', async () => {
      app.get('/test', authenticate, (req, res) => {
        expect(req.user).toBeUndefined();
        res.status(200).json({ message: 'success' });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('success');
    });

    it('should authenticate user with valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        roles: [{ role: { name: 'ADMIN' } }],
        tenant: {
          id: 'tenant-123',
          slug: 'test-tenant',
          name: 'Test Tenant',
          status: 'ACTIVE',
        },
      };

      // Mock Prisma
      jest.mock('../src/database/prisma', () => ({
        prisma: {
          user: {
            findUnique: jest.fn().mockResolvedValue(mockUser),
          },
        },
      }));

      const token = jwt.sign(
        { id: 'user-123', email: 'test@example.com', tenantId: 'tenant-123' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      app.get('/test', authenticate, (req, res) => {
        expect(req.user).toBeDefined();
        expect(req.user?.id).toBe('user-123');
        expect(req.user?.email).toBe('test@example.com');
        expect(req.user?.roles).toContain('ADMIN');
        res.status(200).json({ message: 'authenticated' });
      });

      const response = await request(app)
        .get('/test')
        .set('Cookie', [`auth-token=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('authenticated');
    });

    it('should clear cookie for invalid token', async () => {
      app.get('/test', authenticate, (req, res) => {
        expect(req.user).toBeUndefined();
        res.status(200).json({ message: 'success' });
      });

      const response = await request(app)
        .get('/test')
        .set('Cookie', [`auth-token=invalid-token`]);

      expect(response.status).toBe(200);
    });

    it('should handle inactive user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        isActive: false,
        roles: [],
        tenant: { status: 'ACTIVE' },
      };

      jest.mock('../src/database/prisma', () => ({
        prisma: {
          user: {
            findUnique: jest.fn().mockResolvedValue(mockUser),
          },
        },
      }));

      const token = jwt.sign(
        { id: 'user-123', email: 'test@example.com', tenantId: 'tenant-123' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      app.get('/test', authenticate, (req, res) => {
        res.status(200).json({ message: 'authenticated' });
      });

      app.use((err: any, req: any, res: any, next: any) => {
        if (err instanceof AppError) {
          return res.status(err.statusCode).json({
            type: err.type,
            message: err.message,
          });
        }
        res.status(500).json({ error: 'Internal server error' });
      });

      const response = await request(app)
        .get('/test')
        .set('Cookie', [`auth-token=${token}`]);

      expect(response.status).toBe(401);
      expect(response.body.type).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('requireAuth', () => {
    it('should throw error when user is not authenticated', async () => {
      app.get('/protected', requireAuth, (req, res) => {
        res.status(200).json({ message: 'success' });
      });

      app.use((err: any, req: any, res: any, next: any) => {
        if (err instanceof AppError) {
          return res.status(err.statusCode).json({
            type: err.type,
            message: err.message,
          });
        }
        res.status(500).json({ error: 'Internal server error' });
      });

      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.type).toBe('AUTHENTICATION_ERROR');
    });

    it('should pass when user is authenticated', async () => {
      app.use((req, res, next) => {
        req.user = {
          id: 'user-123',
          email: 'test@example.com',
          tenantId: 'tenant-123',
          roles: ['ADMIN'],
          permissions: ['content:create'],
        };
        next();
      });

      app.get('/protected', requireAuth, (req, res) => {
        expect(req.user).toBeDefined();
        res.status(200).json({ message: 'authorized' });
      });

      const response = await request(app).get('/protected');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('authorized');
    });
  });
});
