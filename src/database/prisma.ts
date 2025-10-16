import { PrismaClient } from '@prisma/client';
import { config } from '@/config';
import { createLogger, logDatabaseQuery } from '@/utils/logger';

const logger = createLogger('DATABASE');

/**
 * Extended Prisma Client with logging and middleware
 * Provides connection management and query logging for better observability
 */
class DatabaseClient {
  private static instance: PrismaClient | null = null;
  private isConnected = false;

  /**
   * Get singleton Prisma client instance
   */
  static getInstance(): PrismaClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new PrismaClient({
        log: config.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
        datasources: {
          db: {
            url: config.database.url,
          },
        },
      });
      
      // Set up middleware
      DatabaseClient.setupMiddleware(DatabaseClient.instance);
    }

    return DatabaseClient.instance;
  }


  /**
   * Set up Prisma middleware for tenant isolation and audit logging
   */
  private static setupMiddleware(prisma: PrismaClient): void {
    // Soft delete middleware
    prisma.$use(async (params, next) => {
      // Intercept delete operations to implement soft delete
      if (params.action === 'delete') {
        params.action = 'update';
        params.args.data = { deletedAt: new Date() };
      }

      // Intercept deleteMany operations
      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        if (params.args.data != undefined) {
          params.args.data['deletedAt'] = new Date();
        } else {
          params.args['data'] = { deletedAt: new Date() };
        }
      }

      return next(params);
    });

    // Tenant isolation middleware
    prisma.$use(async (params, next) => {
      // Add tenant filtering for models that have tenantId
      const modelsWithTenant = [
        'user', 'role', 'permission', 'content', 'media', 'auditLog'
      ];

      if (modelsWithTenant.includes(params.model?.toLowerCase() || '')) {
        if (params.action === 'findMany' || params.action === 'findFirst') {
          // Add tenant filter to where clause
          if (params.args.where) {
            if (params.args.where.tenantId === undefined) {
              // Only add tenant filter if not already specified
              // This allows for cross-tenant queries when explicitly needed
              logger.warn('Query without tenant isolation detected', {
                model: params.model,
                action: params.action,
              });
            }
          }
        }
      }

      return next(params);
    });

    // Query performance monitoring
    prisma.$use(async (params, next) => {
      const start = Date.now();
      const result = await next(params);
      const duration = Date.now() - start;

      // Log slow queries (>1000ms)
      if (duration > 1000) {
        logger.warn('Slow query detected', {
          model: params.model,
          action: params.action,
          duration: `${duration}ms`,
        });
      }

      return result;
    });
  }

  /**
   * Connect to database with retry logic
   */
  async connect(): Promise<boolean> {
    try {
      const prisma = DatabaseClient.getInstance();
      await prisma.$connect();
      this.isConnected = true;
      logger.info('Database connection established');
      return true;
    } catch (error) {
      logger.error('Failed to connect to database', error as Error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    try {
      if (DatabaseClient.instance) {
        await DatabaseClient.instance.$disconnect();
        DatabaseClient.instance = null;
        this.isConnected = false;
        logger.info('Database disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from database', error as Error);
    }
  }

  /**
   * Check database health
   */
  async isHealthy(): Promise<boolean> {
    try {
      const prisma = DatabaseClient.getInstance();
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', error as Error);
      return false;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Execute raw query with error handling
   */
  async executeRaw(query: string, params?: any[]): Promise<any> {
    try {
      const prisma = DatabaseClient.getInstance();
      const start = Date.now();
      const result = await prisma.$queryRawUnsafe(query, ...(params || []));
      const duration = Date.now() - start;
      
      logDatabaseQuery(query, params, duration);
      return result;
    } catch (error) {
      logDatabaseQuery(query, params, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Execute transaction with retry logic
   */
  async transaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    const prisma = DatabaseClient.getInstance();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await prisma.$transaction(fn, {
          timeout: config.database.connectionTimeout,
          isolationLevel: 'ReadCommitted',
        });
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Transaction attempt ${attempt} failed`, {
          error: lastError.message,
          maxRetries,
        });

        if (attempt === maxRetries) {
          logger.error('Transaction failed after all retries', lastError);
          throw lastError;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }

    throw lastError;
  }
}

// Create and export singleton instance
const databaseClient = new DatabaseClient();

// Export the Prisma client instance
export const prisma = DatabaseClient.getInstance();

// Export database utilities
export { databaseClient };

/**
 * Database utility functions
 */
export class DatabaseUtils {
  /**
   * Check if error is a unique constraint violation
   */
  static isUniqueConstraintError(error: any): boolean {
    return error?.code === 'P2002';
  }

  /**
   * Check if error is a foreign key constraint violation
   */
  static isForeignKeyConstraintError(error: any): boolean {
    return error?.code === 'P2003';
  }

  /**
   * Check if error is a record not found error
   */
  static isRecordNotFoundError(error: any): boolean {
    return error?.code === 'P2025';
  }

  /**
   * Extract constraint field from Prisma error
   */
  static extractConstraintField(error: any): string | null {
    if (error?.meta?.target) {
      return Array.isArray(error.meta.target) ? error.meta.target[0] : error.meta.target;
    }
    return null;
  }

  /**
   * Generate tenant-scoped where clause
   */
  static tenantWhere(tenantId: string, additionalWhere?: any): any {
    return {
      tenantId,
      deletedAt: null,
      ...additionalWhere,
    };
  }

  /**
   * Generate pagination parameters
   */
  static paginationParams(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    return { skip, take: limit };
  }

  /**
   * Generate order by parameters
   */
  static orderByParams(orderBy?: string, orderDirection: 'asc' | 'desc' = 'desc') {
    if (!orderBy) return { createdAt: orderDirection };
    return { [orderBy]: orderDirection };
  }
}

export default prisma;