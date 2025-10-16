import Redis from 'ioredis';
import { config } from '@/config';
import { createLogger } from '@/utils/logger';

const logger = createLogger('REDIS');

/**
 * Redis client instance with connection management
 * Handles connection, reconnection, and error handling for Redis cache
 */
class RedisClient {
  private client: Redis | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  constructor() {
    this.connect();
  }

  /**
   * Establish Redis connection with retry logic
   */
  private async connect(): Promise<void> {
    try {
      this.client = new Redis(config.redis.url, {
        db: config.redis.db,
        password: config.redis.password || undefined,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4, // Use IPv4
        commandTimeout: 5000,
      });

      // Connection event handlers
      this.client.on('connect', () => {
        logger.info('Redis connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      this.client.on('error', (error) => {
        logger.error('Redis connection error', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', (delay) => {
        this.reconnectAttempts++;
        logger.info(`Redis reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          logger.error('Max Redis reconnection attempts reached');
          this.client?.disconnect();
        }
      });

      // Establish connection
      await this.client.connect();
      
    } catch (error) {
      logger.error('Failed to connect to Redis', error as Error);
      throw error;
    }
  }

  /**
   * Get Redis client instance
   */
  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  /**
   * Check if Redis is connected and available
   */
  isHealthy(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Ping Redis to check connectivity
   */
  async ping(): Promise<boolean> {
    try {
      if (!this.client) return false;
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed', error as Error);
      return false;
    }
  }

  /**
   * Get cache value with error handling
   */
  async get(key: string): Promise<string | null> {
    try {
      if (!this.client || !this.isConnected) {
        logger.warn('Redis not available for GET operation', { key });
        return null;
      }
      
      const result = await this.client.get(key);
      logger.debug('Cache GET operation', { key, hit: result !== null });
      return result;
    } catch (error) {
      logger.error('Redis GET operation failed', error as Error, { key });
      return null; // Graceful degradation
    }
  }

  /**
   * Set cache value with TTL and error handling
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        logger.warn('Redis not available for SET operation', { key });
        return false;
      }

      let result: string;
      if (ttlSeconds) {
        result = await this.client.setex(key, ttlSeconds, value);
      } else {
        result = await this.client.set(key, value);
      }

      logger.debug('Cache SET operation', { key, ttl: ttlSeconds });
      return result === 'OK';
    } catch (error) {
      logger.error('Redis SET operation failed', error as Error, { key });
      return false; // Graceful degradation
    }
  }

  /**
   * Delete cache key
   */
  async del(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        logger.warn('Redis not available for DEL operation', { key });
        return false;
      }

      const result = await this.client.del(key);
      logger.debug('Cache DEL operation', { key, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error('Redis DEL operation failed', error as Error, { key });
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      if (!this.client || !this.isConnected) {
        logger.warn('Redis not available for pattern deletion', { pattern });
        return 0;
      }

      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      const result = await this.client.del(...keys);
      logger.debug('Cache pattern deletion', { pattern, keysDeleted: result });
      return result;
    } catch (error) {
      logger.error('Redis pattern deletion failed', error as Error, { pattern });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) return false;
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS operation failed', error as Error, { key });
      return false;
    }
  }

  /**
   * Set key expiration
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) return false;
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXPIRE operation failed', error as Error, { key, seconds });
      return false;
    }
  }

  /**
   * Increment numeric value
   */
  async incr(key: string): Promise<number | null> {
    try {
      if (!this.client || !this.isConnected) return null;
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Redis INCR operation failed', error as Error, { key });
      return null;
    }
  }

  /**
   * Gracefully disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      logger.info('Disconnecting from Redis');
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }
}

// Create and export singleton instance
export const redisClient = new RedisClient();

/**
 * Cache utility functions with JSON serialization
 */
export class CacheService {
  private redis: Redis;

  constructor(redisInstance: Redis) {
    this.redis = redisInstance;
  }

  /**
   * Get and parse JSON value from cache
   */
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache JSON parse error', error as Error, { key });
      return null;
    }
  }

  /**
   * Set JSON value in cache
   */
  async setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      return await redisClient.set(key, serialized, ttlSeconds);
    } catch (error) {
      logger.error('Cache JSON serialize error', error as Error, { key });
      return false;
    }
  }

  /**
   * Cache with automatic key generation for tenant isolation
   */
  generateTenantKey(tenantId: string, key: string): string {
    return `tenant:${tenantId}:${key}`;
  }

  /**
   * Cache with automatic key generation for user isolation
   */
  generateUserKey(userId: string, key: string): string {
    return `user:${userId}:${key}`;
  }

  /**
   * Invalidate all cache entries for a tenant
   */
  async invalidateTenant(tenantId: string): Promise<number> {
    return await redisClient.delPattern(`tenant:${tenantId}:*`);
  }

  /**
   * Invalidate all cache entries for a user
   */
  async invalidateUser(userId: string): Promise<number> {
    return await redisClient.delPattern(`user:${userId}:*`);
  }
}

// Export cache service instance
export const cacheService = new CacheService(redisClient.getClient());

export default redisClient;