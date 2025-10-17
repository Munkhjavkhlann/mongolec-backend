import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from '@/config';
import { typeDefs } from '@/graphql/schema';
import { resolvers } from '@/graphql/resolvers';
import { GraphQLContext } from '@/types';
import { prisma, databaseClient } from '@/database/prisma';
import { redisClient } from '@/database/redis';
// Middleware temporarily disabled for troubleshooting
import { createLogger, logRequest } from '@/utils/logger';
import { AppError, ErrorType } from '@/types';

const logger = createLogger('SERVER');

/**
 * Apollo Server with Express integration
 * Provides GraphQL API with multi-tenant support, authentication, and comprehensive middleware
 */
export class GraphQLServer {
  private app: express.Application;
  private httpServer: http.Server;
  private apolloServer: ApolloServer<GraphQLContext>;

  constructor() {
    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.apolloServer = this.createApolloServer();
  }

  /**
   * Create and configure Apollo Server instance
   */
  private createApolloServer(): ApolloServer<GraphQLContext> {
    return new ApolloServer<GraphQLContext>({
      typeDefs,
      resolvers,
      plugins: [
        // Proper shutdown for the HTTP server
        ApolloServerPluginDrainHttpServer({ httpServer: this.httpServer }),

        // Custom plugins for logging and monitoring
        {
          async requestDidStart() {
            return {
              async willSendResponse(requestContext: any) {
                const { request, response } = requestContext;
                logger.debug('GraphQL operation completed', {
                  operationName: request.operationName,
                  variables: config.isDevelopment ? request.variables : undefined,
                  errors: response.body.kind === 'single' && response.body.singleResult.errors?.length,
                });
              },
              async didEncounterErrors(requestContext: any) {
                const { request, errors } = requestContext;
                logger.error('GraphQL operation errors', new Error('GraphQL Errors'), {
                  operationName: request.operationName,
                  errors: errors.map((error: any) => ({
                    message: error.message,
                    path: error.path,
                    locations: error.locations,
                  })),
                });
              },
            };
          },
        },
      ],
      
      // Error formatting
      formatError: (formattedError, error) => {
        // Log error details
        logger.error('GraphQL error occurred', error as Error, {
          formattedError,
          path: formattedError.path,
          locations: formattedError.locations,
        });

        // Don't expose internal errors in production
        if (config.isProduction && !(error instanceof AppError)) {
          return {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
            path: formattedError.path,
            locations: formattedError.locations,
          };
        }

        return {
          message: formattedError.message,
          code: (error as any)?.code || 'UNKNOWN_ERROR',
          path: formattedError.path,
          locations: formattedError.locations,
          ...(config.isDevelopment && { stack: (formattedError as any).stack }),
        };
      },

      // Introspection enabled for GraphQL clients (Postman, Insomnia, etc.)
      introspection: true,
    });
  }

  /**
   * Set up Express middleware stack
   */
  private setupMiddleware(): void {
    // Security middleware with relaxed CSP for Apollo Sandbox
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP to allow Apollo Sandbox to work
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: true, // Enable credentials for cookies
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    }));

    // Request logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.info('HTTP Request', { message: message.trim() });
        }
      }
    }));

    // Cookie parsing
    this.app.use(cookieParser());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Custom request logging with response time
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const responseTime = Date.now() - start;
        logRequest(req, res, responseTime);
        
        // Track API calls for tenant (disabled for troubleshooting)
        // if ((req as any).tenant?.id) {
        //   TenantMiddleware.trackApiCall((req as any).tenant.id).catch(error => {
        //     logger.error('Failed to track API call', error);
        //   });
        // }
      });
      
      next();
    });

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealthy = await databaseClient.isHealthy();
        const redisHealthy = await redisClient.ping();
        
        const status = dbHealthy && redisHealthy ? 'healthy' : 'degraded';
        const statusCode = status === 'healthy' ? 200 : 503;
        
        res.status(statusCode).json({
          status,
          timestamp: new Date().toISOString(),
          services: {
            database: dbHealthy ? 'up' : 'down',
            redis: redisHealthy ? 'up' : 'down',
          },
          version: process.env.npm_package_version || '1.0.0',
          uptime: process.uptime(),
        });
      } catch (error) {
        logger.error('Health check failed', error as Error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        });
      }
    });

    // Metrics endpoint (if enabled)
    if (config.monitoring.metricsEnabled) {
      this.app.get('/metrics', (req, res) => {
        // TODO: Implement metrics collection (Prometheus format)
        res.set('Content-Type', 'text/plain');
        res.send('# Metrics not implemented yet\n');
      });
    }

    // GraphQL endpoint with context creation (Apollo's default landing page auto-serves)
    this.app.use('/graphql',
      expressMiddleware(this.apolloServer, {
        context: async ({ req, res }): Promise<GraphQLContext> => {
          // Extract token from cookies instead of Authorization header
          const token = req.cookies['auth-token'];

          let user = null;
          let tenant = null;

          if (token) {
            try {
              const jwt = await import('jsonwebtoken');
              const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

              // Get user from database
              user = await prisma.user.findUnique({
                where: { id: payload.id },
                include: { tenant: true }
              });

              if (user) {
                tenant = user.tenant;
              }
            } catch (error) {
              // Invalid token - clear the cookie
              res.clearCookie('auth-token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
                path: '/'
              });
            }
          }

          return {
            req,
            res,
            prisma,
            redis: redisClient.isHealthy() ? redisClient.getClient() : null as any,
            user,
            tenant,
            dataSources: {
              userService: null,
              tenantService: null,
              contentService: null,
            },
          };
        }
      })
    );

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        path: req.originalUrl,
      });
    });

    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error in Express', error);

      if (res.headersSent) {
        return next(error);
      }

      let statusCode = 500;
      let errorResponse = {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        ...(config.isDevelopment && { stack: error.stack }),
      };

      if (error instanceof AppError) {
        statusCode = error.statusCode;
        errorResponse = {
          error: error.type,
          message: error.message,
          ...(error.details && { details: error.details }),
          ...(config.isDevelopment && { stack: error.stack }),
        };
      }

      res.status(statusCode).json(errorResponse);
    });
  }

  /**
   * Initialize server connections and start listening
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting GraphQL server...');

      // Connect to database
      const dbConnected = await databaseClient.connect();
      if (!dbConnected) {
        throw new Error('Failed to connect to database');
      }

      // Verify Redis connection
      const redisHealthy = await redisClient.ping();
      if (!redisHealthy) {
        logger.warn('Redis connection failed - caching will be disabled');
      }

      // Start Apollo Server
      await this.apolloServer.start();
      logger.info('Apollo Server started successfully');

      // Set up Express middleware
      this.setupMiddleware();

      // Start HTTP server
      await new Promise<void>((resolve) => {
        this.httpServer.listen(config.port, config.host, () => {
          resolve();
        });
      });

      logger.info(`🚀 GraphQL Server ready at http://${config.host}:${config.port}/graphql`);
      logger.info(`📊 Health check available at http://${config.host}:${config.port}/health`);
      
      if (config.monitoring.metricsEnabled) {
        logger.info(`📈 Metrics available at http://${config.host}:${config.port}/metrics`);
      }

    } catch (error) {
      logger.error('Failed to start server', error as Error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown the server
   */
  async stop(): Promise<void> {
    try {
      logger.info('Shutting down GraphQL server...');

      // Stop Apollo Server
      await this.apolloServer.stop();
      logger.info('Apollo Server stopped');

      // Close HTTP server
      await new Promise<void>((resolve, reject) => {
        this.httpServer.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      logger.info('HTTP server stopped');

      // Disconnect from database
      await databaseClient.disconnect();
      logger.info('Database disconnected');

      // Disconnect from Redis
      await redisClient.disconnect();
      logger.info('Redis disconnected');

      logger.info('GraphQL server shutdown complete');
    } catch (error) {
      logger.error('Error during server shutdown', error as Error);
      throw error;
    }
  }

  /**
   * Get Express app instance (for testing)
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get HTTP server instance
   */
  getHttpServer(): http.Server {
    return this.httpServer;
  }

  /**
   * Get Apollo Server instance
   */
  getApolloServer(): ApolloServer<GraphQLContext> {
    return this.apolloServer;
  }
}

export default GraphQLServer;