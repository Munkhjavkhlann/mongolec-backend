import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import { GraphQLContext } from '@/types';
import { contentResolvers } from './content-simple';
import { newsResolvers } from './news';
import { authResolvers } from './auth';
import { merchResolvers } from './merch';

/**
 * Custom scalar type for DateTime
 */
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: any) {
    // Convert outgoing Date to ISO string
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }
    throw new Error('Value must be a Date object or string');
  },
  parseValue(value: any) {
    // Convert incoming value to Date
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    throw new Error('Value must be a string or number');
  },
  parseLiteral(ast) {
    // Convert AST literal to Date
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
      return new Date(ast.value);
    }
    throw new Error('Value must be a string or integer');
  },
});

/**
 * Custom scalar type for JSON
 */
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value: any) {
    // Convert outgoing value to JSON
    return value;
  },
  parseValue(value: any) {
    // Convert incoming value from JSON
    return value;
  },
  parseLiteral(ast) {
    // Convert AST literal to JSON
    switch (ast.kind) {
      case Kind.STRING:
        return JSON.parse(ast.value);
      case Kind.OBJECT:
        return parseObject(ast);
      case Kind.LIST:
        return ast.values.map(parseLiteral);
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.NULL:
        return null;
      default:
        throw new Error(`Unexpected kind in parseLiteral: ${ast.kind}`);
    }
  },
});

/**
 * Helper function to parse object literals in JSON scalar
 */
function parseObject(ast: any) {
  const obj: any = {};
  ast.fields.forEach((field: any) => {
    obj[field.name.value] = parseLiteral(field.value);
  });
  return obj;
}

/**
 * Helper function to parse literal values
 */
function parseLiteral(ast: any): any {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
      return parseInt(ast.value, 10);
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT:
      return parseObject(ast);
    case Kind.LIST:
      return ast.values.map(parseLiteral);
    case Kind.NULL:
      return null;
    default:
      throw new Error(`Unexpected kind: ${ast.kind}`);
  }
}

/**
 * Main resolver object combining all resolver modules
 */
export const resolvers = {
  // Custom scalars
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  // Query resolvers
  Query: {
    // Health check
    health: async () => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };
    },
    hello: () => 'Hello from Mongolec GraphQL Backend! 🚀',

    // Delegate to specific resolver modules
    ...authResolvers.Query,
    ...contentResolvers.Query,
    ...newsResolvers.Query,
    ...merchResolvers.Query,
  },

  // Mutation resolvers
  Mutation: {
    // Delegate to specific resolver modules
    ...authResolvers.Mutation,
    ...contentResolvers.Mutation,
    ...newsResolvers.Mutation,
    ...merchResolvers.Mutation,
  },

  // Type resolvers
  Tenant: {
    ...authResolvers.Tenant,
  },
  Content: {
    ...contentResolvers.Content,
  },
};

export default resolvers;