import { GraphQLScalarType, Kind } from 'graphql';

// Import queries
import { authQueries } from './queries/auth';
import { userQueries } from './queries/user';
import { tenantQueries } from './queries/tenant';
import { newsQueries } from './queries/news';
import { merchQueries } from './queries/merch';
import { orderQueries } from './queries/order';
import { contentQueries } from './queries/content';
import { rallyQueries } from './queries/rally';
import { applicationQueries } from './queries/application';
import { nominationQueries } from './queries/nomination';
import { storyQueries } from './queries/story';
import { mediaQueries } from './queries/media';
import { partnershipQueries } from './queries/partnership';
import { newsletterQueries } from './queries/newsletter';
import { teamQueries } from './queries/team';
import { rangerQueries } from './queries/ranger';
import { participantQueries } from './queries/participant';

// Import mutations
import { authMutations } from './mutations/auth';
import { userMutations } from './mutations/user';
import { newsMutations } from './mutations/news';
import { merchMutations } from './mutations/merch';
import { orderMutations } from './mutations/order';
import { contentMutations } from './mutations/content';
import { tenantMutations } from './mutations/tenant';
import { uploadResolvers } from './mutations/upload';
import { rallyMutations } from './mutations/rally';
import { applicationMutations } from './mutations/application';
import { nominationMutations } from './mutations/nomination';
import { storyMutations } from './mutations/story';
import { mediaMutations } from './mutations/media';
import { partnershipMutations } from './mutations/partnership';
import { newsletterMutations } from './mutations/newsletter';
import { teamMutations } from './mutations/team';
import { rangerMutations } from './mutations/ranger';
import { participantMutations } from './mutations/participant';

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

const Rally = {
  // Old records may have null before @default(0) was added
  currentParticipants: (parent: any) => parent.currentParticipants ?? 0,
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
  Rally,

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
    ...userQueries,
    ...tenantQueries,
    ...newsQueries,
    ...merchQueries,
    ...orderQueries,
    ...contentQueries,
    ...rallyQueries,
    ...applicationQueries,
    ...nominationQueries,
    ...storyQueries,
    ...mediaQueries,
    ...partnershipQueries,
    ...newsletterQueries,
    ...teamQueries,
    ...rangerQueries,
    ...participantQueries,
  },

  // Root Mutation
  Mutation: {
    // Domain mutations
    ...authMutations,
    ...userMutations,
    ...tenantMutations,
    ...newsMutations,
    ...merchMutations, // Includes variant mutations
    ...orderMutations, // Guest createMerchOrder + admin status update
    ...contentMutations,
    ...uploadResolvers.Mutation,
    ...rallyMutations,
    ...applicationMutations,
    ...nominationMutations,
    ...storyMutations,
    ...mediaMutations,
    ...partnershipMutations,
    ...newsletterMutations,
    ...teamMutations,
    ...rangerMutations,
    ...participantMutations,
  },
};

export default resolvers;
