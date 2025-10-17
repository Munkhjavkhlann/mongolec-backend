import { GraphQLScalarType, Kind } from 'graphql';

// Import queries
import { authQueries } from './queries/auth';
import { newsQueries } from './queries/news';
import { merchQueries } from './queries/merch';
import { contentQueries } from './queries/content';

// Import mutations
import { authMutations } from './mutations/auth';
import { newsMutations } from './mutations/news';
import { merchMutations } from './mutations/merch';
import { contentMutations } from './mutations/content';

/**
 * Custom scalar resolvers
 */
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value: any) {
    return value;
  },
  parseValue(value: any) {
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.OBJECT || ast.kind === Kind.STRING) {
      return ast;
    }
    return null;
  },
});

/**
 * Type resolvers
 */
const Tenant = {
  // Map database status field to GraphQL isActive field
  isActive: (parent: any) => parent.status === 'ACTIVE',
};

/**
 * Combined Resolvers
 * Merges all domain resolvers with scalars and base resolvers
 */
export const resolvers = {
  // Custom Scalars
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  // Type Resolvers
  Tenant,

  // Root Query
  Query: {
    // Health check
    health: () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    }),
    hello: () => 'Hello from GraphQL!',

    // Domain queries
    ...authQueries,
    ...newsQueries,
    ...merchQueries,
    ...contentQueries,
  },

  // Root Mutation
  Mutation: {
    // Domain mutations
    ...authMutations,
    ...newsMutations,
    ...merchMutations,
    ...contentMutations,
  },
};

export default resolvers;
