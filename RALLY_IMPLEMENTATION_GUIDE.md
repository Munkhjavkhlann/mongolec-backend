# Rally for Rangers - Implementation Guide

## ✅ What's Been Completed

### 1. Database Schema (Prisma)
- ✅ **9 models** added to support Rally for Rangers
- ✅ Multi-tenant architecture with proper relations
- ✅ Soft deletes throughout
- ✅ Application form fully mapped to schema
- ✅ Nomination form fully mapped to schema
- ✅ Donation tracking (Stripe placeholders)
- ✅ All enums defined

**Models:**
1. `Rally` - Main rally management
2. `RallyApplication` - Rider & supporter applications
3. `ParkNomination` - Park nomination forms
4. `Donation` - Donation tracking
5. `Sponsor` - Sponsor management
6. `ParkPartnership` - National park partnerships
7. `Story` - Impact stories, ranger/rider profiles
8. `RallyMedia` - Rally-specific media
9. `NewsletterSubscription` - Newsletter management

### 2. GraphQL Schema
- ✅ Complete type definitions for all models
- ✅ 50+ queries defined
- ✅ 100+ mutations defined
- ✅ Pagination support
- ✅ Filtering and sorting
- ✅ Proper input types
- ✅ Response types

**Schema Files Created:**
- `src/graphql/schema/rally/types.ts` - All type definitions
- `src/graphql/schema/rally/queries.ts` - All query definitions
- `src/graphql/schema/rally/mutations.ts` - All mutation definitions
- `src/graphql/schema/rally/index.ts` - Main export

---

## 📋 Implementation Checklist

### Phase 1: Core CRUD Operations (Current)
- [ ] Implement rally resolvers (queries + mutations)
- [ ] Implement application resolvers (queries + mutations)
- [ ] Implement nomination resolvers (queries + mutations)

### Phase 2: Public Forms
- [ ] Build application form submission endpoint
- [ ] Build nomination form submission endpoint
- [ ] Add form validation
- [ ] Add email notifications

### Phase 3: Content Management
- [ ] Implement story resolvers
- [ ] Implement media resolvers
- [ ] Add image upload functionality
- [ ] Build admin interface helpers

### Phase 4: Partnerships & Donations
- [ ] Implement sponsor resolvers
- [ ] Implement park partnership resolvers
- [ ] Implement donation resolvers
- [ ] Add public donation page support

### Phase 5: Newsletter
- [ ] Implement newsletter resolvers
- [ ] Add Mailchimp/SendGrid integration (optional)
- [ ] Build newsletter signup component

---

## 🚀 Quick Start: Implementing Resolvers

### Step 1: Create Rally Resolvers

Create `src/graphql/resolvers/queries/rally.ts`:

```typescript
import { Prisma } from '@prisma/client';

export const rallyQueries = {
  // Get all rallies with pagination
  rallies: async (_: any, args: any, context: any) => {
    const { page = 1, limit = 20, status, search, orderBy = 'createdAt', orderDirection = 'desc' } = args;

    const where: Prisma.RallyWhereInput = {
      tenantId: context.tenantId,
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
        ],
      }),
    };

    const [rallies, total] = await Promise.all([
      context.prisma.rally.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderBy]: orderDirection },
        include: {
          tenant: true,
          createdBy: true,
          updatedBy: true,
        },
      }),
      context.prisma.rally.count({ where }),
    ]);

    return {
      rallies,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        perPage: limit,
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  },

  // Get single rally
  rally: async (_: any, args: any, context: any) => {
    return context.prisma.rally.findFirst({
      where: {
        tenantId: context.tenantId,
        deletedAt: null,
        ...(args.slug && { slug: args.slug }),
        ...(args.id && { id: args.id }),
      },
      include: {
        tenant: true,
        createdBy: true,
        updatedBy: true,
        applications: true,
        donations: true,
        sponsors: true,
        media: true,
        stories: true,
      },
    });
  },

  // Get upcoming rallies
  upcomingRallies: async (_: any, args: any, context: any) => {
    const { page = 1, limit = 20 } = args;

    const where = {
      tenantId: context.tenantId,
      deletedAt: null,
      status: { in: ['UPCOMING', 'ONGOING'] },
    };

    const [rallies, total] = await Promise.all([
      context.prisma.rally.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: 'asc' },
      }),
      context.prisma.rally.count({ where }),
    ]);

    return {
      rallies,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        perPage: limit,
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  },

  // Get recruiting rallies
  recruitingRallies: async (_: any, _args: any, context: any) => {
    return context.prisma.rally.findMany({
      where: {
        tenantId: context.tenantId,
        deletedAt: null,
        isRecruiting: true,
        status: { in: ['UPCOMING', 'ONGOING'] },
      },
      orderBy: { startDate: 'asc' },
    });
  },
};
```

### Step 2: Create Rally Mutations

Create `src/graphql/resolvers/mutations/rally.ts`:

```typescript
import { AppError, ErrorType } from '../../../utils/error';

export const rallyMutations = {
  // Create rally
  createRally: async (_: any, args: any, context: any) => {
    const { data } = args;

    // Check permissions
    if (!context.user) {
      throw new AppError('Authentication required', ErrorType.AUTHENTICATION_ERROR, 401);
    }

    const hasPermission = context.user.permissions.includes('rally:create');
    if (!hasPermission) {
      throw new AppError('Permission denied', ErrorType.AUTHORIZATION_ERROR, 403);
    }

    // Check if slug exists
    const existing = await context.prisma.rally.findUnique({
      where: { slug_tenantId: { slug: data.slug, tenantId: context.tenantId } },
    });

    if (existing) {
      throw new AppError('Rally with this slug already exists', ErrorType.VALIDATION_ERROR, 400);
    }

    // Calculate duration if not provided
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const duration = data.duration || Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return context.prisma.rally.create({
      data: {
        ...data,
        duration,
        tenantId: context.tenantId,
        createdById: context.user.id,
      },
      include: {
        tenant: true,
        createdBy: true,
      },
    });
  },

  // Update rally
  updateRally: async (_: any, args: any, context: any) => {
    const { id, data } = args;

    // Check permissions
    if (!context.user || !context.user.permissions.includes('rally:update')) {
      throw new AppError('Permission denied', ErrorType.AUTHORIZATION_ERROR, 403);
    }

    // Verify rally belongs to tenant
    const rally = await context.prisma.rally.findFirst({
      where: { id, tenantId: context.tenantId, deletedAt: null },
    });

    if (!rally) {
      throw new AppError('Rally not found', ErrorType.NOT_FOUND, 404);
    }

    return context.prisma.rally.update({
      where: { id },
      data: {
        ...data,
        updatedById: context.user.id,
      },
    });
  },

  // Delete rally (soft delete)
  deleteRally: async (_: any, args: any, context: any) => {
    const { id } = args;

    // Check permissions
    if (!context.user || !context.user.permissions.includes('rally:delete')) {
      throw new AppError('Permission denied', ErrorType.AUTHORIZATION_ERROR, 403);
    }

    await context.prisma.rally.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Rally deleted successfully',
    };
  },

  // Update rally status
  updateRallyStatus: async (_: any, args: any, context: any) => {
    const { id, status } = args;

    if (!context.user || !context.user.permissions.includes('rally:update')) {
      throw new AppError('Permission denied', ErrorType.AUTHORIZATION_ERROR, 403);
    }

    return context.prisma.rally.update({
      where: { id },
      data: { status, updatedById: context.user.id },
    });
  },

  // Toggle recruiting status
  toggleRecruiting: async (_: any, args: any, context: any) => {
    const { id } = args;

    if (!context.user || !context.user.permissions.includes('rally:update')) {
      throw new AppError('Permission denied', ErrorType.AUTHORIZATION_ERROR, 403);
    }

    const rally = await context.prisma.rally.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    return context.prisma.rally.update({
      where: { id },
      data: {
        isRecruiting: !rally.isRecruiting,
        updatedById: context.user.id,
      },
    });
  },
};
```

### Step 3: Register Schema and Resolvers

Update `src/graphql/schema/index.ts`:

```typescript
import { rallySchema } from './rally';

export const typeDefs = [
  // ... existing type defs
  rallySchema,
];
```

Update `src/graphql/resolvers/index.ts`:

```typescript
import { rallyQueries } from './queries/rally';
import { rallyMutations } from './mutations/rally';

export const resolvers = {
  // ... existing resolvers
  Query: {
    // ... existing queries
    ...rallyQueries,
  },
  Mutation: {
    // ... existing mutations
    ...rallyMutations,
  },
};
```

---

## 🔐 Required Permissions

Add these permissions to your RBAC system:

```javascript
// Rally Management
'rally:create'     // Create new rallies
'rally:read'       // View rallies
'rally:update'     // Update rallies
'rally:delete'     // Delete rallies

// Application Management
'application:read'    // View applications
'application:manage'  // Approve/reject applications
'application:delete'  // Delete applications

// Nomination Management
'nomination:read'    // View nominations
'nomination:manage'  // Approve/reject nominations
'nomination:delete'  // Delete nominations

// Content Management
'story:create'   // Create stories
'story:read'     // View stories
'story:update'   // Update stories
'story:delete'   // Delete stories
'media:upload'   // Upload media
'media:manage'   // Manage media

// Partnerships
'sponsor:manage'      // Manage sponsors
'partnership:manage'  // Manage park partnerships

// Donations
'donation:read'   // View donations
'donation:manage' // Manage donations

// Newsletter
'newsletter:read'    // View subscribers
'newsletter:manage'  // Manage subscriptions
```

---

## 📊 Example Queries

### Get Upcoming Rallies (Public)
```graphql
query GetUpcomingRallies {
  upcomingRallies(page: 1, limit: 10) {
    rallies {
      id
      slug
      title
      description
      startDate
      endDate
      location
      cost
      heroImage
      isRecruiting
      applicationDeadline
    }
    pagination {
      total
      totalPages
      hasNextPage
    }
  }
}
```

### Submit Application (Public)
```graphql
mutation SubmitApplication {
  submitRallyApplication(data: {
    rallyId: "rally-id"
    firstName: "John"
    lastName: "Doe"
    email: "john@example.com"
    phone: "+1234567890"
    country: "USA"
    city: "New York"
    hasValidPassport: true
    isRider: true
    hasMotorcycleLicense: true
    ridingExperience: {
      years: 5
      terrain: ["adventure", "off-road"]
      bikes: ["BMW GS1250"]
    }
    motivation: {
      en: "I want to support park rangers"
    }
    travelExperience: {
      en: "I've traveled to 10+ countries"
    }
    emergencyContactFirstName: "Jane"
    emergencyContactLastName: "Smith"
    emergencyContactPhone: "+1234567890"
    emergencyContactEmail: "jane@example.com"
    emergencyContactRelationship: "Spouse"
    agreedToTerms: true
    agreedToLiability: true
  }) {
    success
    message
    application {
      id
      status
      email
    }
  }
}
```

### Submit Park Nomination (Public)
```graphql
mutation SubmitNomination {
  submitParkNomination(data: {
    country: "Mongolia"
    parkNames: ["Gobi Gurvansaikhan National Park"]
    parkContactFirstName: "Bat"
    parkContactLastName: "Dorj"
    parkContactEmail: "bat@gobi.mn"
    partnerOrganizationName: "Mongol Ecology Center"
    partnerContactFirstName: "John"
    partnerContactLastName: "Smith"
    partnerContactEmail: "john@mongolec.org"
    primaryMission: {
      en: "Protect Gobi bear habitat and desert ecosystem"
    }
    motorcycleSupport: {
      en: "1) Patrol vast desert areas, 2) Respond to poaching quickly, 3) Reach remote ranger stations"
    }
  }) {
    success
    message
    nomination {
      id
      status
    }
  }
}
```

---

## 🎯 Next Steps

1. **Implement Resolvers** - Start with Rally resolvers
2. **Add Validation** - Use Joi schemas for form validation
3. **Email Notifications** - Add confirmation emails for applications/nominations
4. **Admin Dashboard** - Build React components for management
5. **Testing** - Write unit and integration tests
6. **Documentation** - Add API documentation with examples

---

## 📝 Notes

- All datetime fields should be ISO 8601 format
- JSON fields support multi-language: `{"en": "text", "mn": "текст"}`
- Soft deletes are used throughout (check `deletedAt`)
- All operations are tenant-isolated
- Public mutations don't require authentication
- Admin operations require specific permissions
- Application forms match the actual forms shared by user

---

**Status**: GraphQL schema complete ✅
**Next**: Implement resolvers 🚀
