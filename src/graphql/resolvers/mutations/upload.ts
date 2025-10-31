import { getPresignedUploadUrl, PresignedUrlResponse } from "../../../libs/file-storage";

export const uploadResolvers = {
  Mutation: {
    /**
     * Resolver for the createPresignedUploadUrl mutation.
     * It takes a fileType (MIME type) as input and returns a pre-signed URL for uploading.
     */
    createPresignedUploadUrl: async (_: any, { fileType }: { fileType: string }): Promise<PresignedUrlResponse> => {
      if (!fileType) {
        throw new Error("A 'fileType' argument is required.");
      }
      return getPresignedUploadUrl(fileType);
    },
  },
};
