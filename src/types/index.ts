import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import type { ExtendedPrismaClient } from '@/database/prisma';

/**
 * GraphQL Context interface
 * Contains all services and data sources available to resolvers
 */
export interface GraphQLContext {
  req: Request;
  res: Response;
  prisma: ExtendedPrismaClient;
  redis: Redis;
  user?: AuthenticatedUser;
  tenant?: Tenant;
  dataSources: {
    userService: any; // Will be defined with actual service classes
    tenantService: any;
    contentService: any;
  };
}

/**
 * Authenticated user interface
 * Represents a verified user from JWT token
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

/**
 * Tenant interface for multi-tenant architecture
 */
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  domain?: string;
  status: TenantStatus;
  plan: TenantPlan;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant status enumeration
 */
export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Tenant plan enumeration
 */
export enum TenantPlan {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

/**
 * Tenant settings interface
 */
export interface TenantSettings {
  timezone: string;
  locale: string;
  features: {
    cms: boolean;
    analytics: boolean;
    customDomain: boolean;
    api: boolean;
  };
  limits: {
    users: number;
    storage: number; // in bytes
    apiCalls: number; // per month
  };
  customization: {
    theme: string;
    logo?: string;
    favicon?: string;
  };
}

/**
 * JWT Token payload interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  tenantId: string;
  roles: string[];
  iat: number;
  exp: number;
}

/**
 * API Response wrapper interface
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
    requestId: string;
  };
}

/**
 * Pagination input interface
 */
export interface PaginationInput {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Filter and search input
 */
export interface FilterInput {
  search?: string;
  filters?: Record<string, any>;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

/**
 * Base entity interface
 * All database entities should extend this
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Audit log interface for tracking changes
 */
export interface AuditLog extends BaseEntity {
  tenantId: string;
  userId: string;
  entity: string;
  entityId: string;
  action: AuditAction;
  changes: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit action enumeration
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

/**
 * Permission system interfaces
 */
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  tenantId: string;
}

/**
 * Error types for better error handling
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  DUPLICATE_ERROR = 'DUPLICATE_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TENANT_ERROR = 'TENANT_ERROR',
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;

    // This clips the constructor invocation from the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database transaction type
 */
export type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Service base interface
 */
export interface BaseService {
  readonly prisma: ExtendedPrismaClient;
  readonly redis: Redis;
  readonly tenantId?: string;
}

/**
 * Cache key builder utility type
 */
export type CacheKey = string | (() => string);

/**
 * Redis cache options
 */
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // For cache invalidation
  prefix?: string;
}

/**
 * File upload interface
 */
export interface FileUpload {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => NodeJS.ReadableStream;
}

/**
 * Health check status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    [key: string]: 'up' | 'down';
  };
  version: string;
  uptime: number;
}

export default {};