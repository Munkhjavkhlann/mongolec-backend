import { S3Client } from "@aws-sdk/client-s3";

// These variables will be loaded from your .env file
const { B2_ENDPOINT, B2_REGION, B2_ACCESS_KEY_ID, B2_SECRET_ACCESS_KEY } = process.env;

if (!B2_ENDPOINT || !B2_REGION || !B2_ACCESS_KEY_ID || !B2_SECRET_ACCESS_KEY) {
  // In a real app, you might want to handle this more gracefully
  // For example, by having a default fallback or a clearer error message.
  // However, for essential services, failing fast is often a good strategy.
  throw new Error("Backblaze B2 environment variables are not fully configured.");
}

export const s3Client = new S3Client({
  endpoint: B2_ENDPOINT,
  region: B2_REGION,
  credentials: {
    accessKeyId: B2_ACCESS_KEY_ID,
    secretAccessKey: B2_SECRET_ACCESS_KEY,
  },
});
