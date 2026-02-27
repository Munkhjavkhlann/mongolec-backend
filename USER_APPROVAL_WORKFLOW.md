# User Admin Approval Workflow

Complete guide for implementing and using the admin approval system for user registrations.

## Overview

New user registrations now require admin approval before they can access the system. This provides an additional layer of security and control over who joins your platform.

## Workflow

```
User Signs Up → Pending Approval → Admin Reviews → Approved/Rejected
                                        ↓
                                   Can Login
```

## User States

### 1. **PENDING** (Initial State)
- `isActive: false`
- `approvedAt: null`
- `rejectedAt: null`
- User **cannot** log in
- Waiting for admin approval

### 2. **ACTIVE** (Approved)
- `isActive: true`
- `approvedAt: <timestamp>`
- `approvedBy: <admin_id>`
- User **can** log in

### 3. **REJECTED**
- `isActive: false`
- `rejectedAt: <timestamp>`
- `rejectedBy: <admin_id>`
- `rejectionReason: <reason>`
- User **cannot** log in

### 4. **INACTIVE** (Manually Deactivated)
- `isActive: false`
- `approvedAt: <timestamp>`
- Previously active but disabled by admin
- User **cannot** log in

---

## Database Changes

### New Fields Added to User Model

```prisma
model User {
  // ... existing fields ...

  // Admin approval tracking
  approvedAt       DateTime?
  approvedBy       String?   // User ID of admin who approved
  rejectedAt       DateTime?
  rejectedBy       String?   // User ID of admin who rejected
  rejectionReason  String?
}

// Changed default
isActive          Boolean   @default(false)  // Was: true
```

---

## GraphQL API

### Queries

#### Get Pending Users
```graphql
query GetPendingUsers {
  pendingUsers(page: 1, limit: 20) {
    users {
      id
      email
      firstName
      lastName
      createdAt
    }
    pagination {
      total
      totalPages
    }
  }
}
```

#### Get Rejected Users
```graphql
query GetRejectedUsers {
  rejectedUsers(page: 1, limit: 20) {
    users {
      id
      email
      rejectionReason
      rejectedAt
      rejectedBy
    }
    pagination {
      total
    }
  }
}
```

#### Get All Users (with filtering)
```graphql
query GetUsers {
  users(
    page: 1
    limit: 20
    search: "john"
    status: ACTIVE  # ACTIVE, PENDING, REJECTED, INACTIVE
    orderBy: "createdAt"
    orderDirection: "desc"
  ) {
    users {
      id
      email
      firstName
      lastName
      isActive
      approvedAt
      rejectedAt
      roles {
        role {
          name
        }
      }
    }
    pagination {
      total
      totalPages
    }
  }
}
```

#### Get User Approval Statistics
```graphql
query GetApprovalStats {
  userApprovalStats {
    totalUsers
    activeUsers
    pendingUsers
    rejectedUsers
    inactiveUsers
    recentRegistrations  # Last 7 days
    approvalRate        # Percentage
  }
}
```

#### Get Single User
```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    email
    firstName
    lastName
    isActive
    emailVerified
    approvedAt
    approvedBy
    rejectedAt
    rejectedBy
    rejectionReason
    tenant {
      name
    }
    roles {
      role {
        name
        permissions {
          permission {
            name
            resource
            action
          }
        }
      }
    }
  }
}
```

### Mutations

#### Approve User
```graphql
mutation ApproveUser($userId: ID!) {
  approveUser(userId: $userId) {
    success
    message
    user {
      id
      email
      isActive
      approvedAt
    }
  }
}
```

#### Reject User
```graphql
mutation RejectUser($userId: ID!, $reason: String) {
  rejectUser(userId: $userId, reason: $reason) {
    success
    message
    user {
      id
      email
      rejectedAt
      rejectionReason
    }
  }
}
```

#### Activate User (give rejected user another chance)
```graphql
mutation ActivateUser($userId: ID!) {
  activateUser(userId: $userId) {
    success
    message
    user {
      id
      email
      isActive
      approvedAt
    }
  }
}
```

#### Deactivate User (temporarily disable)
```graphql
mutation DeactivateUser($userId: ID!, $reason: String) {
  deactivateUser(userId: $userId, reason: $reason) {
    success
    message
    user {
      id
      email
      isActive
    }
  }
}
```

#### Register (Updated)
```graphql
mutation Register(
  $email: String!
  $password: String!
  $firstName: String!
  $lastName: String!
  $tenantSlug: String!
) {
  register(
    email: $email
    password: $password
    firstName: $firstName
    lastName: $lastName
    tenantSlug: $tenantSlug
  ) {
    success
    message  # "Registration successful. Your account is pending admin approval."
    user {
      id
      email
      isActive  # false - requires approval
    }
  }
}
```

---

## Permissions Required

All user management mutations and queries require the `user:manage` or `user:read` permissions:

```typescript
// Required permissions:
approveUser:     'user:manage'
rejectUser:      'user:manage'
activateUser:    'user:manage'
deactivateUser:  'user:manage'

pendingUsers:    'user:read'
rejectedUsers:   'user:read'
users:           'user:read'
user:            'user:read'
userApprovalStats: 'user:read'
```

---

## Admin Dashboard Example

Here's a complete example of an admin dashboard page:

```typescript
import { gql, useQuery, useMutation } from '@apollo/client';

// Queries
const GET_PENDING_USERS = gql`
  query GetPendingUsers($page: Int, $limit: Int) {
    pendingUsers(page: $page, limit: $limit) {
      users {
        id
        email
        firstName
        lastName
        createdAt
      }
      pagination {
        total
        totalPages
      }
    }
  }
`;

const GET_STATS = gql`
  query GetStats {
    userApprovalStats {
      totalUsers
      activeUsers
      pendingUsers
      rejectedUsers
      approvalRate
    }
  }
`;

// Mutations
const APPROVE_USER = gql`
  mutation ApproveUser($userId: ID!) {
    approveUser(userId: $userId) {
      success
      message
      user {
        id
        email
        isActive
      }
    }
  }
`;

const REJECT_USER = gql`
  mutation RejectUser($userId: ID!, $reason: String) {
    rejectUser(userId: $userId, reason: $reason) {
      success
      message
    }
  }
`;

// Admin Component
function UserApprovalDashboard() {
  const { data: statsData } = useQuery(GET_STATS);
  const { data: pendingData, loading } = useQuery(GET_PENDING_USERS, {
    variables: { page: 1, limit: 20 },
  });

  const [approveUser] = useMutation(APPROVE_USER);
  const [rejectUser] = useMutation(REJECT_USER);

  const handleApprove = async (userId: string) => {
    await approveUser({ variables: { userId } });
    // Refetch queries
  };

  const handleReject = async (userId: string, reason: string) => {
    await rejectUser({ variables: { userId, reason } });
    // Refetch queries
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Pending Users</h3>
          <p>{statsData?.userApprovalStats.pendingUsers}</p>
        </div>
        <div className="stat-card">
          <h3>Active Users</h3>
          <p>{statsData?.userApprovalStats.activeUsers}</p>
        </div>
        <div className="stat-card">
          <h3>Approval Rate</h3>
          <p>{statsData?.userApprovalStats.approvalRate}%</p>
        </div>
      </div>

      {/* Pending Users Table */}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Registered</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pendingData?.pendingUsers.users.map((user) => (
            <tr key={user.id}>
              <td>{user.firstName} {user.lastName}</td>
              <td>{user.email}</td>
              <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              <td>
                <button onClick={() => handleApprove(user.id)}>
                  Approve
                </button>
                <button onClick={() => {
                  const reason = prompt('Rejection reason:');
                  if (reason) handleReject(user.id, reason);
                }}>
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Email Notifications (Optional Enhancement)

You can add email notifications to inform users when their account is approved or rejected:

### After Approval
```typescript
// In approveUser mutation
await sendEmail({
  to: user.email,
  subject: 'Your account has been approved!',
  template: 'account-approved',
  data: {
    firstName: user.firstName,
    loginUrl: 'https://yourapp.com/login',
  },
});
```

### After Rejection
```typescript
// In rejectUser mutation
await sendEmail({
  to: user.email,
  subject: 'Account registration status',
  template: 'account-rejected',
  data: {
    firstName: user.firstName,
    reason: rejectionReason,
  },
});
```

---

## Testing the Workflow

### 1. Register a New User
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation Register($email: String!, $password: String!, $firstName: String!, $lastName: String!, $tenantSlug: String!) { register(email: $email, password: $password, firstName: $firstName, lastName: $lastName, tenantSlug: $tenantSlug) { success message user { id email isActive } } }",
    "variables": {
      "email": "newuser@example.com",
      "password": "SecurePass123",
      "firstName": "John",
      "lastName": "Doe",
      "tenantSlug": "default"
    }
  }'
```

**Response:**
```json
{
  "data": {
    "register": {
      "success": true,
      "message": "Registration successful. Your account is pending admin approval.",
      "user": {
        "id": "user_123",
        "email": "newuser@example.com",
        "isActive": false
      }
    }
  }
}
```

### 2. Try to Login (Should Fail)
```bash
# Login attempt will fail with:
# "Your account is inactive or pending admin approval"
```

### 3. Admin Approves User
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=<admin-token>" \
  -d '{
    "query": "mutation ApproveUser($userId: ID!) { approveUser(userId: $userId) { success message user { id email isActive approvedAt } } }",
    "variables": {
      "userId": "user_123"
    }
  }'
```

### 4. User Can Now Login Successfully
```bash
# Login will now succeed!
```

---

## Migration Steps

### 1. Update Database
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Or run migration
npm run db:migrate
```

### 2. Update Existing Users
If you have existing users, you might want to approve them all:

```sql
-- Approve all existing active users
UPDATE "users"
SET
  "isActive" = true,
  "approvedAt" = NOW(),
  "approvedBy" = '<system-admin-id>'
WHERE "isActive" = true
AND "approvedAt" IS NULL;
```

### 3. Seed Admin Permissions
Make sure you have the necessary permissions:

```typescript
// Seed file
const userManagePermission = await prisma.permission.upsert({
  where: {
    resource_action_tenantId: {
      resource: 'user',
      action: 'manage',
      tenantId: defaultTenant.id,
    },
  },
  update: {},
  create: {
    name: 'user:manage',
    resource: 'user',
    action: 'manage',
    tenantId: defaultTenant.id,
  },
});

// Assign to admin role
await prisma.rolePermission.upsert({
  where: { roleId_permissionId: { roleId: adminRoleId, permissionId: userManagePermission.id } },
  update: {},
  create: {
    roleId: adminRoleId,
    permissionId: userManagePermission.id,
  },
});
```

---

## Security Considerations

### 1. Tenant Isolation
- Admins can only approve/reject users in their own tenant
- Cross-tenant approval is blocked

### 2. Permission Checks
- All user management operations require `user:manage` permission
- Cannot approve/reject yourself

### 3. Audit Trail
- All approval/rejection actions are logged
- Tracks who approved/rejected and when
- Includes rejection reasons

### 4. Error Messages
- Generic error messages for non-admins
- Specific messages for admins
- No sensitive information leaked

---

## Common Scenarios

### Scenario 1: User Registrations
1. User fills registration form
2. System creates user with `isActive: false`
3. User sees: "Your account is pending admin approval"
4. Admin receives notification (if implemented)
5. Admin reviews and approves/rejects
6. User receives email notification (if implemented)

### Scenario 2: User Was Rejected, Admin Changes Mind
1. Use `activateUser` mutation
2. Clears rejection fields
3. Sets `isActive: true`
4. User can now log in

### Scenario 3: User Needs Temporary Deactivation
1. Use `deactivateUser` mutation
2. Sets `isActive: false`
3. Keeps approval fields intact
4. Can be reactivated later

---

## Troubleshooting

### Issue: Users can't log in after approval
**Solution:** Check that the user's `isActive` field is actually `true` and `approvedAt` is set.

### Issue: Admin can't see pending users
**Solution:** Verify admin has `user:read` permission.

### Issue: Can't approve users
**Solution:** Check for `user:manage` permission and tenant membership.

### Issue: Old users can't log in
**Solution:** Run migration to approve existing active users (see Migration Steps above).

---

## Next Steps

1. **Set up database** - Run migrations
2. **Create admin role** - With user:manage permission
3. **Build admin UI** - Dashboard for approval
4. **Add email notifications** - Optional but recommended
5. **Test the flow** - End-to-end testing
6. **Monitor approvals** - Track approval rates and reasons

---

**Status:** ✅ Complete and ready to use!

The admin approval workflow is fully implemented. Just run the database migrations and you're good to go!
