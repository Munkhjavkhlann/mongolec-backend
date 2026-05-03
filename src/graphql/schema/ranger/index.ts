import { gql } from 'graphql-tag';

export const rangerSchema = gql`
  type Ranger {
    id: ID!
    name: String!
    photo: String
    parkName: String!
    country: String!
    bio: String
    displayOrder: Int!
    isActive: Boolean!
    rallyId: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type PaginatedRangers {
    rangers: [Ranger!]!
    pagination: PaginationInfo!
  }

  extend type Query {
    getRangers(limit: Int, page: Int, isActive: Boolean): PaginatedRangers!
    getRanger(id: ID!): Ranger
  }

  extend type Mutation {
    createRanger(input: CreateRangerInput!): Ranger!
    updateRanger(id: ID!, input: UpdateRangerInput!): Ranger!
    deleteRanger(id: ID!): Boolean!
  }

  input CreateRangerInput {
    name: String!
    photo: String
    parkName: String!
    country: String!
    bio: String
    displayOrder: Int
    isActive: Boolean
    rallyId: String
  }

  input UpdateRangerInput {
    name: String
    photo: String
    parkName: String
    country: String
    bio: String
    displayOrder: Int
    isActive: Boolean
    rallyId: String
  }
`;
