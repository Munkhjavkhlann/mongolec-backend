import winston from 'winston';
import { config } from '@/config';

/**
 * Custom log format for structured logging
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      ...(stack && { stack }),
      ...(Object.keys(meta).length > 0 && { meta })
    };
    return JSON.stringify(logEntry);
  })
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${message}${stack ? '\n' + stack : ''}`;
  })
);

/**
 * Create transports based on configuration
 */
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: config.isDevelopment ? consoleFormat : logFormat,
    level: config.logging.level
  })
];

// Add file transport if enabled
if (config.logging.fileEnabled) {
  transports.push(
    new winston.transports.File({
      filename: `${config.logging.filePath}/error.log`,
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: `${config.logging.filePath}/combined.log`,
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

/**
 * Main logger instance
 */
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false,
});

/**
 * Structured logging utility for different contexts
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(message: string, meta?: Record<string, any>) {
    return {
      message,
      context: this.context,
      ...meta
    };
  }

  debug(message: string, meta?: Record<string, any>) {
    logger.debug(this.formatMessage(message, meta));
  }

  info(message: string, meta?: Record<string, any>) {
    logger.info(this.formatMessage(message, meta));
  }

  warn(message: string, meta?: Record<string, any>) {
    logger.warn(this.formatMessage(message, meta));
  }

  error(message: string, error?: Error, meta?: Record<string, any>) {
    logger.error(this.formatMessage(message, {
      ...meta,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      })
    }));
  }
}

/**
 * Factory function to create context-specific loggers
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Request logging middleware helper
 */
export function logRequest(req: any, res: any, responseTime?: number) {
  const requestLogger = createLogger('HTTP');
  
  requestLogger.info('Request processed', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    tenantId: req.tenant?.id,
    userId: req.user?.id,
  });
}

/**
 * Database query logging helper
 */
export function logDatabaseQuery(query: string, params?: any[], duration?: number, error?: Error) {
  const dbLogger = createLogger('DATABASE');
  
  if (error) {
    dbLogger.error('Database query failed', error, {
      query,
      params,
      duration: duration ? `${duration}ms` : undefined,
    });
  } else {
    dbLogger.debug('Database query executed', {
      query,
      params: config.isDevelopment ? params : undefined, // Hide params in production
      duration: duration ? `${duration}ms` : undefined,
    });
  }
}

/**
 * Cache operation logging helper
 */
export function logCacheOperation(operation: 'get' | 'set' | 'del', key: string, hit?: boolean, error?: Error) {
  const cacheLogger = createLogger('CACHE');
  
  if (error) {
    cacheLogger.error(`Cache ${operation} failed`, error, { key });
  } else {
    cacheLogger.debug(`Cache ${operation}`, {
      key,
      ...(operation === 'get' && { hit })
    });
  }
}

/**
 * Authentication logging helper
 */
export function logAuth(action: 'login' | 'logout' | 'token_refresh' | 'failed_login', userId?: string, extra?: Record<string, any>) {
  const authLogger = createLogger('AUTH');
  
  authLogger.info(`Authentication: ${action}`, {
    userId,
    ...extra
  });
}

/**
 * Tenant operation logging helper
 */
export function logTenant(action: string, tenantId: string, userId?: string, extra?: Record<string, any>) {
  const tenantLogger = createLogger('TENANT');
  
  tenantLogger.info(`Tenant operation: ${action}`, {
    tenantId,
    userId,
    ...extra
  });
}

export default logger;