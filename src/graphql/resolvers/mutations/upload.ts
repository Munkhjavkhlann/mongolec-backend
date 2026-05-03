import { getPresignedUploadUrl, PresignedUrlResponse } from '../../../libs/file-storage';
import { AppError, ErrorType, GraphQLContext } from '../../../types';

export const uploadResolvers = {
  Mutation: {
    createPresignedUploadUrl: async (
      _: any,
      { fileType }: { fileType: string },
      context: GraphQLContext
    ): Promise<PresignedUrlResponse> => {
      if (!context.user) {
        throw new AppError('Authentication required', ErrorType.AUTHENTICATION_ERROR, 401);
      }
      if (!fileType) {
        throw new AppError("A 'fileType' argument is required.", ErrorType.VALIDATION_ERROR, 400);
      }
      return getPresignedUploadUrl(fileType);
    },
  },
};
