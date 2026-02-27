import gql from 'graphql-tag';

/**
 * Auth Schema
 * User authentication, authorization, and tenant management
 */
export const authSchema = gql`
  # ============================================
  # Auth Types
  # ============================================

  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    isActive: Boolean!
    emailVerified: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!

    # Admin approval fields
    approvedAt: DateTime
    approvedBy: String
    rejectedAt: DateTime
    rejectedBy: String
    rejectionReason: String

    # Relations
    tenant: Tenant!
    roles: [UserRole!]!
  }

  type UserRole {
    id: ID!
    role: Role!
    assignedAt: DateTime!
  }

  type Role {
    id: ID!
    name: String!
    description: String
    permissions: [Permission!]!
  }

  type Permission {
    id: ID!
    name: String!
    resource: String!
    action: String!
    description: String
  }

  type PaginatedUsers {
    users: [User!]!
    pagination: PaginationInfo!
  }

  type PaginationInfo {
    page: Int!
    limit: Int!
    total: Int!
    totalPages: Int!
  }

  type UserApprovalStats {
    totalUsers: Int!
    activeUsers: Int!
    pendingUsers: Int!
    rejectedUsers: Int!
    inactiveUsers: Int!
    recentRegistrations: Int!
    approvalRate: Int!
  }

  enum TenantStatus {
    ACTIVE
    INACTIVE
    SUSPENDED
    PENDING
    ARCHIVED
  }

  enum TenantPlan {
    FREE
    BASIC
    PRO
    ENTERPRISE
  }

  type Tenant {
    id: ID!
    name: String!
    slug: String!
    domain: String
    isActive: Boolean!
    status: TenantStatus!
    plan: TenantPlan!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateTenantInput {
    name: String!
    slug: String!
    domain: String
    isActive: Boolean
    status: TenantStatus
    plan: TenantPlan
  }

  input UpdateTenantInput {
    name: String
    slug: String
    domain: String
    isActive: Boolean
    status: TenantStatus
    plan: TenantPlan
  }

  type AuthPayload {
    success: Boolean!
    message: String
    user: User!
  }

  type AuthResponse {
    user: User!
    token: String!
  }

  # ============================================
  # Auth Queries
  # ============================================

  extend type Query {
    me: User
    tenants: [Tenant!]!
    tenantById(id: ID!): Tenant
    tenantBySlug(slug: String!): Tenant

    # User Management (Admin)
    user(id: ID!): User
    users(
      page: Int
      limit: Int
      search: String
      status: UserStatus
      orderBy: String
      orderDirection: String
    ): PaginatedUsers!
    pendingUsers(page: Int, limit: Int, search: String): PaginatedUsers!
    rejectedUsers(page: Int, limit: Int): PaginatedUsers!
    userApprovalStats: UserApprovalStats!
  }

  enum UserStatus {
    ACTIVE
    PENDING
    REJECTED
    INACTIVE
  }

  # ============================================
  # Auth Mutations
  # ============================================

  extend type Mutation {
    login(email: String!, password: String!): AuthPayload!
    register(
      email: String!
      password: String!
      firstName: String!
      lastName: String!
      tenantSlug: String!
    ): AuthPayload!
    logout: Boolean!

    # User Management (Admin)
    approveUser(userId: ID!): AuthPayload!
    rejectUser(userId: ID!, reason: String): AuthPayload!
    activateUser(userId: ID!): AuthPayload!
    deactivateUser(userId: ID!, reason: String): AuthPayload!

    # Tenant Management
    createTenant(input: CreateTenantInput!): Tenant!
    updateTenant(id: ID!, input: UpdateTenantInput!): Tenant!
    deleteTenant(id: ID!): Boolean!
  }
`;
