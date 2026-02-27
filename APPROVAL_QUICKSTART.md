# Admin Approval System - Quick Start

## ✅ What's Been Implemented

Complete admin approval workflow for user registrations:

### Database Schema Updates
- ✅ Added approval tracking fields to User model
- ✅ Changed `isActive` default to `false` (requires approval)
- ✅ Added `approvedAt`, `approvedBy`, `rejectedAt`, `rejectedBy`, `rejectionReason`

### GraphQL API
- ✅ **Mutations:**
  - `approveUser(userId)` - Approve pending user
  - `rejectUser(userId, reason)` - Reject user with reason
  - `activateUser(userId)` - Activate rejected user
  - `deactivateUser(userId, reason)` - Deactivate active user

- ✅ **Queries:**
  - `pendingUsers` - Get users awaiting approval
  - `rejectedUsers` - Get rejected users
  - `users` - Get all users with filters
  - `user` - Get single user details
  - `userApprovalStats` - Dashboard statistics

### Authentication Updates
- ✅ Registration now sets `isActive: false`
- ✅ Login checks for active status
- ✅ Clear error messages for pending users

### Security
- ✅ Tenant isolation (admins can only approve their tenant's users)
- ✅ Permission checks (`user:manage` for mutations, `user:read` for queries)
- ✅ Cannot approve/reject yourself
- ✅ Full audit trail

---

## 🚀 Quick Start

### 1. Update Database
```bash
npm run db:push
# or
npm run db:migrate
```

### 2. Approve Existing Users (Optional)
If you have existing users, approve them:
```sql
UPDATE "users"
SET "isActive" = true, "approvedAt" = NOW()
WHERE "isActive" = true
AND "approvedAt" IS NULL;
```

### 3. Test Registration
```graphql
mutation Register {
  register(
    email: "test@example.com"
    password: "SecurePass123"
    firstName: "John"
    lastName: "Doe"
    tenantSlug: "default"
  ) {
    success
    message
    user {
      id
      isActive
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Your account is pending admin approval.",
  "user": { "isActive": false }
}
```

### 4. Admin Approves User
```graphql
mutation ApproveUser {
  approveUser(userId: "user-id-here") {
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

### 5. User Can Now Login
User will be able to log in successfully!

---

## 📊 Admin Dashboard Queries

### Get Pending Users
```graphql
query {
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

### Get Statistics
```graphql
query {
  userApprovalStats {
    totalUsers
    activeUsers
    pendingUsers
    rejectedUsers
    approvalRate
  }
}
```

---

## 🔐 Required Permissions

Admins need these permissions:
- `user:read` - View users and stats
- `user:manage` - Approve/reject/activate/deactivate users

---

## 📝 User States

| State | isActive | approvedAt | rejectedAt | Can Login? |
|-------|----------|------------|-----------|-----------|
| PENDING | false | null | null | ❌ No |
| ACTIVE | true | set | null | ✅ Yes |
| REJECTED | false | null | set | ❌ No |
| INACTIVE | false | set | null | ❌ No (was active) |

---

## 📖 Full Documentation

See `USER_APPROVAL_WORKFLOW.md` for:
- Complete API reference
- Admin dashboard code example
- Testing procedures
- Troubleshooting guide
- Email notification setup

---

## ✅ Checklist

Before going to production:

- [ ] Run database migrations
- [ ] Create admin role with `user:manage` permission
- [ ] Test registration → approval → login flow
- [ ] Build admin UI for approval
- [ ] Add email notifications (optional)
- [ ] Set up monitoring for approval metrics

---

**All done!** The admin approval system is ready to use. 🎉
