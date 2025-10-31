import { S3Client, PutBucketCorsCommand, DeleteBucketCorsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { B2_ENDPOINT, B2_REGION, B2_ACCESS_KEY_ID, B2_SECRET_ACCESS_KEY, B2_BUCKET_NAME } = process.env;

if (!B2_ENDPOINT || !B2_REGION || !B2_ACCESS_KEY_ID || !B2_SECRET_ACCESS_KEY || !B2_BUCKET_NAME) {
  console.error("❌ Error: Backblaze B2 environment variables are not fully configured.");
  process.exit(1);
}

const s3Client = new S3Client({
  endpoint: B2_ENDPOINT,
  region: B2_REGION,
  credentials: {
    accessKeyId: B2_ACCESS_KEY_ID,
    secretAccessKey: B2_SECRET_ACCESS_KEY,
  },
});

async function setupCORS() {
  console.log("🔧 Configuring CORS for Backblaze B2 bucket:", B2_BUCKET_NAME);
  console.log("⚠️  This will DELETE any existing Native API CORS rules and set up S3-compatible CORS.");

  // First, try to delete any existing S3-compatible CORS rules
  try {
    console.log("\n🗑️  Attempting to clear existing S3-compatible CORS rules...");
    const deleteCommand = new DeleteBucketCorsCommand({
      Bucket: B2_BUCKET_NAME,
    });
    await s3Client.send(deleteCommand);
    console.log("✅ Existing S3-compatible CORS rules cleared.");
  } catch (error: any) {
    if (error.name === 'NoSuchCORSConfiguration' || error.$metadata?.httpStatusCode === 404) {
      console.log("ℹ️  No existing S3-compatible CORS rules found (this is fine).");
    } else {
      console.log("⚠️  Could not clear existing rules:", error.message);
    }
  }

  const corsConfiguration = {
    CORSRules: [
      {
        // Allow all localhost ports for development
        AllowedOrigins: [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:3002",
          "http://localhost:5173",
          "http://localhost:5174",
        ],
        // S3-compatible methods needed for uploads
        AllowedMethods: ["PUT", "GET", "HEAD"],
        // Allow all headers (required for signed requests)
        AllowedHeaders: ["*"],
        // Expose headers that the browser can read
        ExposeHeaders: [
          "ETag",
          "x-amz-request-id",
          "x-amz-id-2",
        ],
        // Cache preflight requests for 1 hour
        MaxAgeSeconds: 3600,
      },
    ],
  };

  try {
    console.log("\n📝 Applying new S3-compatible CORS configuration...");
    const command = new PutBucketCorsCommand({
      Bucket: B2_BUCKET_NAME,
      CORSConfiguration: corsConfiguration,
    });

    await s3Client.send(command);

    console.log("\n✅ CORS configuration successfully applied!");
    console.log("\n📋 Applied CORS rules:");
    console.log("   - Allowed origins:", corsConfiguration.CORSRules[0].AllowedOrigins.join(", "));
    console.log("   - Allowed methods:", corsConfiguration.CORSRules[0].AllowedMethods.join(", "));
    console.log("   - Allowed headers: * (all)");
    console.log("   - Expose headers:", corsConfiguration.CORSRules[0].ExposeHeaders?.join(", "));
    console.log("   - Max age: 3600 seconds");
    console.log("\n⏳ Please wait 1-2 minutes for the changes to propagate.");
    console.log("💡 Then try uploading an image again in your browser.");
    console.log("\n🌐 You can verify CORS is working by checking the browser Network tab:");
    console.log("   - Look for an OPTIONS request (preflight)");
    console.log("   - It should return 200 OK");
    console.log("   - Response headers should include: Access-Control-Allow-Origin");
  } catch (error: any) {
    console.error("\n❌ Error configuring CORS:", error.message);
    if (error.$metadata) {
      console.error("   Status code:", error.$metadata.httpStatusCode);
      console.error("   Request ID:", error.$metadata.requestId);
    }
    console.error("\n💡 If you see 'bucket contains B2 Native CORS rules', go to the");
    console.error("   Backblaze web interface and delete all CORS rules first, then run");
    console.error("   this script again.");
    process.exit(1);
  }
}

setupCORS();
