import { gql } from 'graphql-tag';

export const participantSchema = gql`
  type Participant {
    id: ID!
    firstName: String!
    lastName: String!
    photo: String
    country: String!
    bio: String
    isActive: Boolean!
    displayOrder: Int!
    rallyYears: [Int!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type PaginatedParticipants {
    participants: [Participant!]!
    pagination: PaginationInfo!
  }

  extend type Query {
    getParticipants(limit: Int, page: Int, isActive: Boolean): PaginatedParticipants!
    getParticipant(id: ID!): Participant
  }

  extend type Mutation {
    createParticipant(input: CreateParticipantInput!): Participant!
    updateParticipant(id: ID!, input: UpdateParticipantInput!): Participant!
    deleteParticipant(id: ID!): Boolean!
  }

  input CreateParticipantInput {
    firstName: String!
    lastName: String!
    photo: String
    country: String!
    bio: String
    displayOrder: Int
    isActive: Boolean
    rallyYears: [Int!]
  }

  input UpdateParticipantInput {
    firstName: String
    lastName: String
    photo: String
    country: String
    bio: String
    displayOrder: Int
    isActive: Boolean
    rallyYears: [Int!]
  }
`;
