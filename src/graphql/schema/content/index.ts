import gql from 'graphql-tag';

/**
 * Content Schema
 * Simple content management
 */
export const contentSchema = gql`
  # ============================================
  # Content Types
  # ============================================

  type Content {
    id: ID!
    title: String!
    slug: String!
    content: String!
    status: String!
    tenant: Tenant
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateContentInput {
    title: String!
    slug: String!
    content: String!
    status: String
  }

  input UpdateContentInput {
    title: String
    slug: String
    content: String
    status: String
  }

  # ============================================
  # Content Queries
  # ============================================

  extend type Query {
    content: [Content!]!
    contentById(id: ID!): Content
  }

  # ============================================
  # Content Mutations
  # ============================================

  extend type Mutation {
    createContent(input: CreateContentInput!): Content!
    updateContent(id: ID!, input: UpdateContentInput!): Content!
    deleteContent(id: ID!): Boolean!
  }
`;
