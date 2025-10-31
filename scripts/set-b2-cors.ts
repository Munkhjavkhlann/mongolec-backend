import { PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../src/config/s3";

const { B2_BUCKET_NAME } = process.env;

if (!B2_BUCKET_NAME) {
  throw new Error("Backblaze B2 bucket name is not configured in your .env file.");
}

const setCorsPolicy = async () => {
  console.log(`Setting CORS policy for bucket: ${B2_BUCKET_NAME}`);

  const corsConfiguration = {
    CORSRules: [
      {
        AllowedHeaders: ["*"],
        AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
        AllowedOrigins: ["*"],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3600,
      },
    ],
  };

  try {
    const command = new PutBucketCorsCommand({
      Bucket: B2_BUCKET_NAME,
      CORSConfiguration: corsConfiguration,
    });
    await s3Client.send(command);
    console.log("Successfully set CORS policy on the bucket.");
  } catch (error) {
    console.error("Error setting CORS policy:", error);
    process.exit(1);
  }
};

setCorsPolicy();
