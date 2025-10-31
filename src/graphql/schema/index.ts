import gql from 'graphql-tag';
import { authSchema } from './auth';
import { newsSchema } from './news';
import { merchSchema } from './merch';
import { contentSchema } from './content';
import { uploadTypeDefs } from "./upload";

/**
 * Base Schema
 * Scalars, base Query/Mutation types, and health check
 */
const baseSchema = gql`
  scalar DateTime
  scalar JSON

  # ============================================
  # Health Check
  # ============================================

  type Health {
    status: String!
    timestamp: String!
    version: String!
  }

  # ============================================
  # Base Query & Mutation Types
  # ============================================

  type Query {
    health: Health!
    hello: String!
  }

  type Mutation {
    _empty: String
  }
`;

/**
 * Combined Type Definitions
 * Merges all domain schemas with base schema
 */
export const typeDefs = [
  baseSchema,
  authSchema,
  newsSchema,
  merchSchema,
  contentSchema,
  uploadTypeDefs,
];

export default typeDefs;
