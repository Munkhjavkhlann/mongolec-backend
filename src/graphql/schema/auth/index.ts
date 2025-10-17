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

  type Tenant {
    id: ID!
    name: String!
    slug: String!
    domain: String
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
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
  }
`;
