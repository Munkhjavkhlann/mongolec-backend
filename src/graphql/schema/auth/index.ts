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
    createdAt: DateTime!
    updatedAt: DateTime!
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

    # Tenant Management
    createTenant(input: CreateTenantInput!): Tenant!
    updateTenant(id: ID!, input: UpdateTenantInput!): Tenant!
    deleteTenant(id: ID!): Boolean!
  }
`;
