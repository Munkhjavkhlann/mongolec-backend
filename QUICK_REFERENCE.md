# Quick Reference Guide

## Common Usage Patterns

### 🔐 Authentication

```typescript
import { authenticate, requireAuth } from '@/auth';

// Optional auth (public routes)
app.get('/api/public', authenticate, handler);

// Required auth (protected routes)
app.get('/api/protected', authenticate, requireAuth, handler);

// GraphQL - user automatically in context
const resolver = async (_parent, _args, context) => {
  if (!context.user) throw new Error('Not authenticated');
  // Use context.user.id, context.user.roles, etc.
};
```

### 🛡️ Authorization

```typescript
import { checkPermission, checkRole } from '@/auth';

// GraphQL resolver with permission check
const deleteContent = async (_parent, { id }, context) => {
  checkPermission(context, 'content:delete');
  // Or: checkRole(context, 'ADMIN');
  // Proceed with deletion
};

// REST API with permission
import { requirePermission } from '@/auth';
app.delete('/api/content/:id',
  authenticate,
  requirePermission('content:delete'),
  handler
);
```

### ⚡ Rate Limiting

```typescript
import { authRateLimit, apiRateLimit, writeRateLimit } from '@/middleware';

// Apply to routes
app.post('/api/auth/login', authRateLimit, loginHandler);
app.post('/api/content', writeRateLimit, createContentHandler);
app.use('/graphql', graphqlRateLimit);
```

### 🔒 CSRF Protection

```typescript
// Already applied to GraphQL in server.ts
// For custom routes:
import { csrfProtection } from '@/middleware';
app.use('/api/custom', csrfProtection);
```

### ✅ Input Validation

```typescript
import { validateBody, commonSchemas } from '@/middleware';
import Joi from 'joi';

// REST API
const schema = Joi.object({
  email: commonSchemas.email,
  password: commonSchemas.password,
});
app.post('/users', validateBody(schema), createUser);

// GraphQL
import { validateGraphQLInput } from '@/middleware';
const createContent = async (_parent, { input }, context) => {
  const validated = validateGraphQLInput(schema, input);
  // Use validated input
};
```

## Permission Naming Convention

Format: `resource:action`

**Content:**
- `content:create` - Create content
- `content:read` - Read content
- `content:update` - Update own content
- `content:delete` - Delete own content
- `content:update_any` - Update any content
- `content:delete_any` - Delete any content
- `content:publish` - Publish content

**Users:**
- `user:create` - Create users
- `user:read` - Read users
- `user:update` - Update users
- `user:delete` - Delete users
- `user:manage_roles` - Manage user roles

**Tenants:**
- `tenant:admin` - Full tenant administration
- `tenant:manage_settings` - Manage tenant settings
- `tenant:view_analytics` - View analytics

## Role Hierarchy (Recommended)

```
SUPER_ADMIN
├── All permissions across all tenants
├── tenant:admin
└── system:admin

ADMIN
├── All permissions within tenant
├── content:*
├── user:*
└── tenant:manage_settings

EDITOR
├── content:create
├── content:update_own
├── content:delete_own
└── content:publish

MODERATOR
├── content:read
├── content:update_any
└── content:moderate

VIEWER
└── content:read
```

## Common Error Handling

```typescript
import { AppError, ErrorType } from '@/types';

// In resolvers
if (!context.user) {
  throw new AppError(
    'Authentication required',
    ErrorType.AUTHENTICATION_ERROR,
    401
  );
}

if (!hasPermission) {
  throw new AppError(
    'You do not have permission to perform this action',
    ErrorType.AUTHORIZATION_ERROR,
    403
  );
}

if (!resource) {
  throw new AppError(
    'Resource not found',
    ErrorType.NOT_FOUND_ERROR,
    404
  );
}
```

## Validation Examples

```typescript
// User registration
const registerSchema = Joi.object({
  email: commonSchemas.email,
  password: commonSchemas.password,
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  tenantSlug: commonSchemas.slug,
});

// Content creation
const contentSchema = Joi.object({
  title: commonSchemas.multiLangText,
  slug: commonSchemas.slug,
  excerpt: commonSchemas.multiLangText.optional(),
  content: commonSchemas.multiLangText,
  status: commonSchemas.contentStatus,
  type: Joi.string().valid('PAGE', 'POST', 'ARTICLE').required(),
  categoryId: commonSchemas.id.optional(),
});

// Pagination
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().max(200).optional(),
  orderBy: Joi.string().valid('createdAt', 'updatedAt', 'title').default('createdAt'),
  orderDirection: Joi.string().valid('asc', 'desc').default('desc'),
});
```

## Testing Examples

```typescript
// Test authentication
import request from 'supertest';
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { id: 'user-123', email: 'test@test.com', tenantId: 'tenant-123' },
  process.env.JWT_SECRET!
);

await request(app)
  .get('/api/protected')
  .set('Cookie', [`auth-token=${token}`])
  .expect(200);

// Test validation
await request(app)
  .post('/api/users')
  .send({ email: 'invalid' })  // Invalid email
  .expect(400);
```

## Environment Variables

```bash
# Required
JWT_SECRET=minimum-32-characters-secret-key
DATABASE_URL=postgresql://user:pass@host:5432/db

# Optional (with defaults)
JWT_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
NODE_ENV=development
LOG_LEVEL=info

# Monitoring
METRICS_ENABLED=false
HEALTH_CHECK_ENABLED=true
```

## Quick Commands

```bash
# Development
npm run dev                # Start dev server
npm run build              # Build for production
npm run type-check         # Check TypeScript types

# Database
npm run db:generate        # Generate Prisma client
npm run db:push            # Push schema changes
npm run db:migrate         # Run migrations
npm run db:studio          # Open Prisma Studio

# Testing
npm test                   # Run tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage

# Production
npm start                  # Start production server
```

## Debugging Tips

```typescript
// Check user in GraphQL resolver
console.log('User:', context.user);
console.log('Roles:', context.user?.roles);
console.log('Permissions:', context.user?.permissions);

// Check request in REST
app.use((req, res, next) => {
  console.log('User:', req.user);
  console.log('Tenant:', req.tenant);
  next();
});

// Enable debug logging
LOG_LEVEL=debug npm run dev
```

## Common Patterns

### Owner or Admin Check
```typescript
import { checkOwnerOrPermission } from '@/auth';

const updatePost = async (_parent, { id }, context) => {
  const post = await context.prisma.post.findUnique({ where: { id } });
  checkOwnerOrPermission(context, post.createdById, 'content:update_any');
  // Continue...
};
```

### Tenant Isolation
```typescript
// In resolver
const content = await context.prisma.content.findFirst({
  where: {
    id,
    tenantId: context.user.tenantId,  // Enforce tenant isolation
  },
});
```

### Soft Delete Handling
```typescript
// Prisma automatically filters deletedAt via middleware
const activeUsers = await context.prisma.user.findMany();
// Only returns users where deletedAt is null
```

## Common Gotchas

❌ **Don't** forget to wrap resolver auth checks in try/catch
✅ **Do** use AppError for consistent error handling

❌ **Don't** store passwords in logs
✅ **Do** log only user IDs and emails

❌ **Don't** trust client-side validation
✅ **Do** always validate on server

❌ **Don't** forget to check tenant ownership
✅ **Do** enforce tenant isolation in all queries

❌ **Don't** use raw SQL queries
✅ **Do** use Prisma's parameterized queries

## Performance Tips

```typescript
// Use select to limit returned fields
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true },  // Only these fields
});

// Use pagination for large datasets
const users = await prisma.user.findMany({
  take: 20,
  skip: (page - 1) * 20,
});

// Cache frequently accessed data
const cached = await redis.get(`user:${id}`);
```

---

**Need more details?** See `SECURITY_IMPLEMENTATION.md` for comprehensive documentation.
