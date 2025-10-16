# Mongolec Backend - Multi-Tenant GraphQL CMS

A comprehensive backend system built with Node.js, TypeScript, GraphQL, and Prisma, designed for multi-tenant content management systems.

## 🚀 Features

- **Multi-Tenant Architecture**: Complete tenant isolation with flexible resolution strategies
- **GraphQL API**: Comprehensive schema with query, mutation, and subscription support
- **Authentication & Authorization**: JWT-based auth with Role-Based Access Control (RBAC)
- **Content Management**: Full CMS capabilities with hierarchical content structure
- **Media Management**: File upload and media library with metadata support
- **Real-time Updates**: GraphQL subscriptions for live content updates
- **Caching**: Redis-based caching for performance optimization
- **Audit Logging**: Complete audit trail for all operations
- **Type Safety**: Full TypeScript implementation with strict typing
- **Database**: PostgreSQL with Prisma ORM for type-safe database operations

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **API**: GraphQL with Apollo Server
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Authentication**: JWT
- **Validation**: Joi
- **Logging**: Winston
- **Testing**: Jest
- **Code Quality**: ESLint + Prettier

## 📋 Prerequisites

- Node.js 18 or higher
- PostgreSQL 13+
- Redis 6+
- Docker & Docker Compose (for development)

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd backend
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup

```bash
# Start PostgreSQL and Redis with Docker
npm run docker:up

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database with initial data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The GraphQL playground will be available at: `http://localhost:4000/graphql`

## 📚 API Documentation

### Default Admin Credentials

After seeding the database, you can use these credentials:

- **Email**: `admin@mongolec.com`
- **Password**: `admin123`

⚠️ **Important**: Change these credentials in production!

### GraphQL Endpoints

- **GraphQL Playground**: `http://localhost:4000/graphql`
- **Health Check**: `http://localhost:4000/health`
- **Metrics**: `http://localhost:4000/metrics` (if enabled)

### Authentication

All authenticated requests require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Multi-Tenant Support

The API supports multiple tenant resolution strategies:

1. **Header-based**: `X-Tenant-ID: tenant-slug`
2. **Subdomain**: `tenant-slug.api.domain.com`
3. **Path-based**: `/tenant/tenant-slug/...`
4. **Query parameter**: `?tenant=tenant-slug`

## 🗂 Project Structure

```
src/
├── auth/           # Authentication utilities
├── config/         # Configuration management
├── database/       # Database clients (Prisma, Redis)
├── middleware/     # Express & GraphQL middleware
├── resolvers/      # GraphQL resolvers
├── schema/         # GraphQL schema definitions
├── services/       # Business logic services
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── index.ts        # Application entry point

prisma/
├── schema.prisma   # Database schema
└── seed.ts         # Database seeding script
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run start:dev        # Start with ts-node
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema changes to database
npm run db:migrate      # Create and run migrations
npm run db:reset        # Reset database and run seeds
npm run db:seed         # Seed database with initial data
npm run db:studio       # Open Prisma Studio

# Docker
npm run docker:up       # Start PostgreSQL and Redis
npm run docker:down     # Stop containers
npm run docker:logs     # View container logs

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run type-check      # Run TypeScript checks

# Testing
npm test               # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
```

### Code Style

This project uses ESLint and Prettier for code formatting. Run `npm run lint:fix` to automatically fix most issues.

### Database Migrations

When making schema changes:

1. Modify `prisma/schema.prisma`
2. Run `npm run db:migrate` to create migration
3. Run `npm run db:generate` to update Prisma client

## 🏗 Architecture

### Multi-Tenant Isolation

The system implements strict tenant isolation at multiple levels:

- **Database Level**: All models include `tenantId` for row-level isolation
- **API Level**: Middleware automatically filters queries by tenant
- **Cache Level**: All cache keys are tenant-prefixed
- **File Storage**: Media files are organized by tenant

### Authentication Flow

1. User sends credentials to `/graphql` with `login` mutation
2. Server validates credentials and returns JWT tokens
3. Client includes `Authorization: Bearer <token>` in subsequent requests
4. Middleware validates token and attaches user context
5. Resolvers use context for authorization checks

### Permission System

- **Roles**: Collections of permissions (admin, editor, author, etc.)
- **Permissions**: Resource-action pairs (user:read, content:create, etc.)
- **Users**: Can have multiple roles across their tenant
- **Validation**: Automatic permission checking in resolvers

## 📊 Monitoring

### Health Checks

The `/health` endpoint provides system status:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "up",
    "redis": "up"
  },
  "version": "1.0.0",
  "uptime": 12345
}
```

### Logging

All operations are logged with structured data:

- **Authentication**: Login attempts, token usage
- **Database**: Query performance, errors
- **API**: Request/response logging with tenant context
- **Cache**: Hit/miss ratios, performance metrics

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Test files should be placed in `src/**/*.test.ts` or `src/**/*.spec.ts`.

## 🔐 Security

### Best Practices Implemented

- **JWT Token Security**: Secure token generation with blacklisting
- **Password Hashing**: bcrypt with appropriate rounds
- **Input Validation**: Joi schemas for all inputs
- **SQL Injection Prevention**: Prisma ORM with parameterized queries
- **XSS Prevention**: Input sanitization utilities
- **Rate Limiting**: Configurable rate limiting per tenant
- **CORS**: Configurable CORS policies
- **Helmet**: Security headers with helmet.js

### Environment Variables

Ensure these are set in production:

- `JWT_SECRET`: Strong secret for JWT signing
- `ENCRYPTION_KEY`: 32-character key for sensitive data
- `DATABASE_URL`: Secure database connection string
- `REDIS_URL`: Redis connection with authentication

## 🚀 Deployment

### Docker Deployment

```bash
# Build image
docker build -t mongolec-backend .

# Run container
docker run -p 4000:4000 \
  -e DATABASE_URL="your-db-url" \
  -e REDIS_URL="your-redis-url" \
  -e JWT_SECRET="your-jwt-secret" \
  mongolec-backend
```

### Production Checklist

- [ ] Update JWT_SECRET to a strong random value
- [ ] Set secure database credentials
- [ ] Configure Redis with authentication
- [ ] Set up SSL/TLS certificates
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up automated backups
- [ ] Test disaster recovery procedures

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Run linting and fix any issues
7. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the GraphQL schema in the playground

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes and version history.