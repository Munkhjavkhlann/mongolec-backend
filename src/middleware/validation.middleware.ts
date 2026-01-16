import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError, ErrorType } from '@/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('VALIDATION');

/**
 * Validation options
 */
interface ValidationOptions {
  abortEarly?: boolean; // Stop validation on first error
  stripUnknown?: boolean; // Remove unknown keys
  convert?: boolean; // Convert types to match schema
}

/**
 * Joi validation middleware factory
 * Validates request body against Joi schema
 */
export const validateBody = (
  schema: Joi.ObjectSchema,
  options: ValidationOptions = {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  }
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: options.abortEarly,
      stripUnknown: options.stripUnknown,
      convert: options.convert,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      logger.warn('Validation failed', {
        path: req.path,
        method: req.method,
        errors: details,
      });

      throw new AppError(
        'Validation failed',
        ErrorType.VALIDATION_ERROR,
        400,
        true,
        { validationErrors: details }
      );
    }

    // Replace request body with validated and sanitized value
    req.body = value;

    logger.debug('Validation passed', {
      path: req.path,
      method: req.method,
    });

    next();
  };
};

/**
 * Validate request query parameters
 */
export const validateQuery = (
  schema: Joi.ObjectSchema,
  options: ValidationOptions = {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  }
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: options.abortEarly,
      stripUnknown: options.stripUnknown,
      convert: options.convert,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      logger.warn('Query validation failed', {
        path: req.path,
        method: req.method,
        errors: details,
      });

      throw new AppError(
        'Query validation failed',
        ErrorType.VALIDATION_ERROR,
        400,
        true,
        { validationErrors: details }
      );
    }

    req.query = value;
    next();
  };
};

/**
 * Validate request parameters
 */
export const validateParams = (
  schema: Joi.ObjectSchema,
  options: ValidationOptions = {
    abortEarly: false,
    stripUnknown: false,
    convert: true,
  }
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: options.abortEarly,
      stripUnknown: options.stripUnknown,
      convert: options.convert,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      logger.warn('Params validation failed', {
        path: req.path,
        method: req.method,
        errors: details,
      });

      throw new AppError(
        'Parameter validation failed',
        ErrorType.VALIDATION_ERROR,
        400,
        true,
        { validationErrors: details }
      );
    }

    req.params = value;
    next();
  };
};

/**
 * Combined validation middleware
 * Validates body, query, and params together
 */
export const validateRequest = (
  schemas: {
    body?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
  },
  options: ValidationOptions = {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  }
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Validate body
    if (schemas.body) {
      const { error, value } = schemas.body.validate(req.body, {
        abortEarly: options.abortEarly,
        stripUnknown: options.stripUnknown,
        convert: options.convert,
      });

      if (error) {
        const details = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
        }));

        throw new AppError(
          'Validation failed',
          ErrorType.VALIDATION_ERROR,
          400,
          true,
          { validationErrors: details }
        );
      }

      req.body = value;
    }

    // Validate query
    if (schemas.query) {
      const { error, value } = schemas.query.validate(req.query, options);

      if (error) {
        const details = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
        }));

        throw new AppError(
          'Query validation failed',
          ErrorType.VALIDATION_ERROR,
          400,
          true,
          { validationErrors: details }
        );
      }

      req.query = value;
    }

    // Validate params
    if (schemas.params) {
      const { error, value } = schemas.params.validate(req.params, {
        abortEarly: options.abortEarly,
        stripUnknown: false,
        convert: options.convert,
      });

      if (error) {
        const details = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
        }));

        throw new AppError(
          'Parameter validation failed',
          ErrorType.VALIDATION_ERROR,
          400,
          true,
          { validationErrors: details }
        );
      }

      req.params = value;
    }

    next();
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Email validation
  email: Joi.string().email().required().lowercase(),

  // Password validation (min 8 chars, must contain letter and number)
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[A-Za-z])(?=.*\d)/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one letter and one number',
    }),

  // ID validation (cuid or uuid)
  id: Joi.string().required(),

  // Slug validation
  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Slug must contain only lowercase letters, numbers, and hyphens',
    }),

  // URL validation
  url: Joi.string().uri().required(),

  // Pagination
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    orderBy: Joi.string().optional(),
    orderDirection: Joi.string().valid('asc', 'desc').default('desc'),
  },

  // Date range
  dateRange: {
    from: Joi.date().iso().required(),
    to: Joi.date().iso().min(Joi.ref('from')).required(),
  },

  // Multi-language text
  multiLangText: Joi.object().pattern(
    Joi.string().valid('en', 'mn'),
    Joi.string().required()
  ).min(1).required(),

  // Tenant status
  tenantStatus: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'ARCHIVED'),

  // Content status
  contentStatus: Joi.string().valid('DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED'),
};

/**
 * GraphQL input validation helper
 * Use this in GraphQL resolvers to validate arguments
 */
export const validateGraphQLInput = <T>(
  schema: Joi.ObjectSchema,
  input: T,
  fieldName: string = 'input'
): T => {
  const { error, value } = schema.validate(input, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const details = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
      type: detail.type,
    }));

    logger.warn('GraphQL input validation failed', {
      fieldName,
      errors: details,
    });

    throw new AppError(
      'Input validation failed',
      ErrorType.VALIDATION_ERROR,
      400,
      true,
      { validationErrors: details, fieldName }
    );
  }

  return value;
};

/**
 * Sanitize HTML to prevent XSS attacks
 */
export const sanitizeHTML = (html: string): string => {
  // Basic HTML sanitization - remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
};

/**
 * Sanitize object recursively (remove dangerous HTML)
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as any;
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHTML(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Middleware to sanitize request body
 */
export const sanitizeBody = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};
