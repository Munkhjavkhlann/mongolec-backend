import { GetBucketCorsCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../src/config/s3";

const { B2_BUCKET_NAME } = process.env;

if (!B2_BUCKET_NAME) {
  throw new Error("Backblaze B2 bucket name is not configured in your .env file.");
}

const getCorsPolicy = async () => {
  console.log(`Getting CORS policy for bucket: ${B2_BUCKET_NAME}`);

  try {
    const command = new GetBucketCorsCommand({
      Bucket: B2_BUCKET_NAME,
    });
    const response = await s3Client.send(command);
    console.log("Successfully retrieved CORS policy:");
    console.log(JSON.stringify(response.CORSRules, null, 2));
  } catch (error) {
    console.error("Error getting CORS policy:", error);
    process.exit(1);
  }
};

getCorsPolicy();
