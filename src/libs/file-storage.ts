import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config/s3";
import { randomUUID } from "crypto";

const { B2_BUCKET_NAME, B2_PUBLIC_URL } = process.env;

if (!B2_BUCKET_NAME || !B2_PUBLIC_URL) {
    throw new Error("Backblaze B2 bucket name or public URL are not configured.");
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
}

/**
 * Generates a pre-signed URL for uploading a file to Backblaze B2.
 * @param fileType The MIME type of the file to be uploaded (e.g., 'image/jpeg').
 * @returns An object containing the pre-signed upload URL and the final public URL of the file.
 */
export const getPresignedUploadUrl = async (fileType: string): Promise<PresignedUrlResponse> => {
  // Generate a unique key for the file in the bucket
  const fileExtension = fileType.split("/")[1] || "bin";
  const key = `uploads/${randomUUID()}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  // The pre-signed URL is valid for 1 hour
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  // Construct the public URL for the file once uploaded
  const fileUrl = `${B2_PUBLIC_URL}/${key}`;

  return { uploadUrl, fileUrl };
};
