import { gql } from 'apollo-server-express';

export const uploadTypeDefs = gql`
  "Response object for a pre-signed URL request."
  type PresignedUrl {
    "The URL to use for uploading the file."
    uploadUrl: String!
    "The final public URL of the file after upload."
    fileUrl: String!
  }

  extend type Mutation {
    "Creates a pre-signed URL for a file upload."
    createPresignedUploadUrl(fileType: String!): PresignedUrl!
  }
`;
