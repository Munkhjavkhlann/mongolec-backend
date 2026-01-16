# Security & Infrastructure Implementation

This document describes the security enhancements and infrastructure improvements implemented for the Mongolec backend.

## Overview

The following security and infrastructure features have been successfully implemented:

### ✅ Completed Features

1. **Authentication Middleware** - JWT verification and route protection
2. **RBAC Middleware** - Role and permission enforcement
3. **Rate Limiting** - Configurable request rate limits with Redis backend
4. **CSRF Protection** - Cross-site request forgery protection
5. **Input Validation** - Comprehensive validation layer beyond GraphQL
6. **Test Suite** - Jest tests for middleware and security features
7. **Disabled Features Review** - Metrics endpoint enhanced

---

## 1. Authentication Middleware

### Location
- `src/auth/auth.middleware.ts`

### Features
- JWT token verification from httpOnly cookies
- User lookup with roles and permissions
- Tenant validation
- Session management
- Error handling with automatic cookie cleanup

### Usage

#### For REST API Endpoints
```typescript
import { authenticate, requireAuth } from '@/auth';

// Optional authentication (attaches user if token exists)
app.get('/public', authenticate, (req, res) => {
  // req.user will be populated if authenticated
  // req.tenant will be populated if user has tenant
});

// Required authentication (throws error if not authenticated)
app.get('/protected', authenticate, requireAuth, (req, res) => {
  // req.user is guaranteed to exist
});
```

#### For GraphQL Resolvers
User and tenant are automatically attached to the context:
```typescript
export const myResolver = async (_parent, _args, context) => {
  if (!context.user) {
    throw new Error('Authentication required');
  }

  // Access user properties
  const { id, email, tenantId, roles, permissions } = context.user;
};
```

---

## 2. RBAC (Role-Based Access Control) Middleware

### Location
- `src/auth/rbac.middleware.ts`

### Features
- Permission-based access control (`resource:action` format)
- Role-based access control
- Ownership checks
- Tenant isolation enforcement
- GraphQL helper functions

### Usage

#### REST API Middleware
```typescript
import {
  requirePermission,
  requireRole,
  requireAnyPermission,
  requireAllPermissions,
  requireOwnerOrPermission,
  requireTenantAccess
} from '@/auth';

// Single permission check
app.delete('/content/:id',
  authenticate,
  requirePermission('content:delete'),
  deleteContentHandler
);

// Multiple roles (user needs at least one)
app.post('/admin',
  authenticate,
  requireAnyRole(['ADMIN', 'SUPER_ADMIN']),
  adminHandler
);

// Owner or admin permission
app.put('/posts/:id',
  authenticate,
  requireOwnerOrPermission(
    (req) => getPostOwnerId(req.params.id),
    'content:update_any'
  ),
  updatePostHandler
);
```

#### GraphQL Helpers
```typescript
import { checkPermission, checkRole, checkOwnerOrPermission } from '@/auth';

export const deleteContent = async (_parent, { id }, context) => {
  // Check permission
  checkPermission(context, 'content:delete');

  // Check role
  checkRole(context, 'ADMIN');

  // Check ownership or admin permission
  const content = await context.prisma.content.findUnique({ where: { id } });
  checkOwnerOrPermission(context, content.createdById, 'content:update_any');

  // Proceed with deletion
};
```

### Permission Format
Permissions follow the pattern `resource:action`:
- `content:create` - Create content
- `content:read` - Read content
- `content:update` - Update own content
- `content:delete` - Delete own content
- `content:update_any` - Update any content
- `user:manage` - Manage users
- `tenant:admin` - Tenant administration

---

## 3. Rate Limiting Middleware

### Location
- `src/middleware/rateLimit.middleware.ts`

### Features
- Redis-based rate limiting with in-memory fallback
- Configurable windows and limits
- Per-IP and per-user tracking
- Rate limit headers in responses
- Tiered rate limiting by user plan
- Custom rate limiters for different use cases

### Usage

#### Pre-configured Rate Limiters
```typescript
import {
  authRateLimit,      // 5 requests per 15 min
  apiRateLimit,       // 100 requests per 15 min
  readRateLimit,      // 200 requests per 15 min
  writeRateLimit,     // 50 requests per 15 min
  graphqlRateLimit    // 100 requests per 15 min
} from '@/middleware';

// Apply to routes
app.post('/api/auth/login', authRateLimit, loginHandler);
app.get('/api/content', readRateLimit, getContentHandler);
app.post('/api/content', writeRateLimit, createContentHandler);
```

#### Custom Rate Limiter
```typescript
import { rateLimit } from '@/middleware';

const customLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 10,      // 10 requests
  keyPrefix: 'custom',
});

app.use('/api/custom', customLimiter);
```

#### Tiered Rate Limiting
```typescript
import { createTieredRateLimit } from '@/middleware';

const tieredLimiter = createTieredRateLimit((user) => {
  // Return user tier based on user properties
  return user.plan || 'free';
});

app.use('/api/premium', tieredLimiter);
```

### Response Headers
All rate-limited endpoints include these headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-16T12:00:00.000Z
```

---

## 4. CSRF Protection

### Location
- `src/middleware/csrf.middleware.ts`

### Features
- Double-submit cookie pattern
- Automatic token generation for safe methods
- Token validation for state-changing operations
- Redis-backed token storage
- GraphQL mutation protection

### Usage

#### Global Application
```typescript
import { csrfProtection } from '@/middleware';

// Apply to all routes
app.use(csrfProtection);
```

#### GraphQL Integration
Already integrated in `server.ts`:
```typescript
app.use('/graphql', csrfProtection);
```

#### Client-Side Implementation
```javascript
// 1. Get CSRF token from cookie (automatically set by server)
const csrfToken = getCookie('csrf-token');

// 2. Include token in request headers
fetch('/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken,
  },
  body: JSON.stringify({ query: 'mutation { ... }' }),
});
```

#### Token Refresh
```typescript
import { refreshCSRF } from '@/middleware';

app.get('/csrf-token', authenticate, async (req, res) => {
  const { token } = await refreshCSRF(req, res);
  res.json({ token });
});
```

---

## 5. Input Validation

### Location
- `src/middleware/validation.middleware.ts`

### Features
- Joi-based validation schemas
- Request body, query, and parameter validation
- Automatic type conversion
- Unknown field stripping
- XSS prevention via HTML sanitization
- Common validation schemas

### Usage

#### REST API Validation
```typescript
import { validateBody, validateQuery, validateRequest, commonSchemas } from '@/middleware';
import Joi from 'joi';

// Body validation
const userSchema = Joi.object({
  email: commonSchemas.email,
  password: commonSchemas.password,
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
});

app.post('/users', validateBody(userSchema), createUserHandler);

// Query validation
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

app.get('/users', validateQuery(paginationSchema), getUsersHandler);

// Combined validation
app.put('/users/:id',
  validateRequest({
    params: Joi.object({ id: commonSchemas.id }),
    body: userSchema,
  }),
  updateUserHandler
);
```

#### GraphQL Input Validation
```typescript
import { validateGraphQLInput, commonSchemas } from '@/middleware';
import Joi from 'joi';

const createContentSchema = Joi.object({
  title: commonSchemas.multiLangText,
  slug: commonSchemas.slug,
  status: commonSchemas.contentStatus,
});

export const createContent = async (_parent, { input }, context) => {
  // Validate input
  const validatedInput = validateGraphQLInput(createContentSchema, input, 'createContent');

  // Proceed with validated input
  const content = await context.prisma.content.create({
    data: validatedInput,
  });

  return content;
};
```

#### Common Schemas
```typescript
import { commonSchemas } from '@/middleware';

// Email validation
email: commonSchemas.email

// Password validation (min 8 chars, letter + number)
password: commonSchemas.password

// ID validation (cuid/uuid)
id: commonSchemas.id

// Slug validation
slug: commonSchemas.slug

// URL validation
url: commonSchemas.url

// Pagination
{ ...commonSchemas.pagination }

// Date range
{ ...commonSchemas.dateRange }

// Multi-language text
title: commonSchemas.multiLangText

// Tenant status
status: commonSchemas.tenantStatus
```

#### XSS Prevention
```typescript
import { sanitizeHTML, sanitizeObject, sanitizeBody } from '@/middleware';

// Sanitize HTML string
const clean = sanitizeHTML('<script>alert("xss")</script><p>Safe</p>');

// Sanitize entire object
const cleanObj = sanitizeObject(req.body);

// Middleware to automatically sanitize body
app.use(sanitizeBody);
```

---

## 6. Test Suite

### Location
- `tests/`

### Features
- Jest test framework
- Comprehensive middleware tests
- Mock implementations
- Test utilities

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.middleware.test.ts
```

### Test Files
- `tests/auth.middleware.test.ts` - Authentication middleware tests
- `tests/rbac.middleware.test.ts` - RBAC middleware tests
- `tests/validation.middleware.test.ts` - Validation middleware tests
- `tests/setup.ts` - Test configuration and mocks

---

## 7. Metrics Endpoint

### Location
- `src/server.ts` (lines 199-230)

### Features
- System uptime metrics
- Memory usage metrics
- HTTP request tracking
- GraphQL operation tracking
- Prometheus-compatible format

### Usage

Enable in `.env`:
```
METRICS_ENABLED=true
```

Access metrics:
```
GET /metrics
```

Example output:
```
# HELP system_uptime_seconds System uptime in seconds
# TYPE system_uptime_seconds gauge
system_uptime_seconds 1234.56

# HELP nodejs_memory_usage_bytes Node.js memory usage
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} 123456789
nodejs_memory_usage_bytes{type="heap_total"} 98765432
nodejs_memory_usage_bytes{type="heap_used"} 87654321
nodejs_memory_usage_bytes{type="external"} 1234567
```

---

## Integration in server.ts

All middleware has been integrated into the server:

```typescript
// Authentication
app.use(authenticate);

// CSRF Protection (GraphQL only)
app.use('/graphql', csrfProtection);

// Rate Limiting (GraphQL only)
app.use('/graphql', graphqlRateLimit);

// Metrics Endpoint
app.get('/metrics', metricsHandler);
```

---

## Environment Variables

Required for new features:

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# CSRF (optional configuration)
CSRF_TOKEN_LENGTH=32
CSRF_TOKEN_EXPIRY=3600  # 1 hour

# Monitoring
METRICS_ENABLED=true
```

---

## Security Best Practices

### Password Requirements
- Minimum 8 characters
- Must contain at least one letter
- Must contain at least one number

### Permission Naming
Use format `resource:action`:
- `content:create`, `content:read`, `content:update`, `content:delete`
- `user:create`, `user:read`, `user:update`, `user:delete`
- `tenant:admin`

### Role Naming
Use descriptive roles:
- `ADMIN` - Full system access
- `EDITOR` - Content management
- `VIEWER` - Read-only access
- `MODERATOR` - Content moderation

### Rate Limit Strategy
- Authentication endpoints: 5/15min (strict)
- Read operations: 200/15min (generous)
- Write operations: 50/15min (moderate)
- GraphQL: 100/15min (balanced)

---

## Troubleshooting

### CSRF Token Errors
1. Ensure client sends `x-csrf-token` header
2. Check that cookie is readable by JavaScript
3. Verify token matches between cookie and header
4. Refresh token if expired

### Rate Limiting Not Working
1. Check Redis connection
2. Verify configuration in `.env`
3. Check middleware order (rate limit after auth)
4. Review logs for errors

### Authentication Fails
1. Verify JWT_SECRET is set
2. Check token expiration
3. Ensure user is active
4. Verify tenant status is ACTIVE

---

## Next Steps

1. **Run database migrations** to ensure RBAC tables exist
2. **Create initial roles and permissions** in your database
3. **Test authentication flow** with real users
4. **Configure production environment variables**
5. **Set up monitoring** for rate limits and failed authentications
6. **Review and adjust rate limits** based on traffic patterns
7. **Implement tenant API tracking** if needed for analytics

---

## Additional Documentation

- [Prisma Schema](../prisma/schema.prisma) - Database models
- [Type Definitions](../src/types/index.ts) - TypeScript interfaces
- [Configuration](../src/config/index.ts) - Environment configuration
- [Logger](../src/utils/logger.ts) - Logging utilities
