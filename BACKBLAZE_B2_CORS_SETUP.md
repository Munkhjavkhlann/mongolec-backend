# Backblaze B2 CORS Configuration

## Issue

When trying to upload images, you're getting this error:

```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource...
(Reason: CORS header 'Access-Control-Allow-Origin' missing). Status code: 403.
```

This happens because your Backblaze B2 bucket doesn't allow CORS requests from your frontend origin.

## Solution

You need to configure CORS rules on your Backblaze B2 bucket. Here's how:

### Method 1: Using Backblaze Web Interface

1. Go to https://secure.backblaze.com/b2_buckets.htm
2. Click on your bucket name ("Mongolec")
3. Click on "Bucket Settings"
4. Scroll down to "CORS Rules"
5. Click "Add a CORS Rule"
6. Add the following configuration:

**Rule Name**: `allow-uploads`

**Allowed Origins**:

```
http://localhost:3000
http://localhost:3001
http://localhost:3002
```

**Allowed Operations**:

- [x] b2_upload_file
- [x] b2_download_file_by_name
- [x] s3_put
- [x] s3_get
- [x] s3_head

**Allowed Headers**: `*`

**Expose Headers**:

```
x-amz-request-id
x-amz-id-2
ETag
x-amz-server-side-encryption
x-amz-version-id
```

**Max Age Seconds**: `3600`

### Method 2: Using Backblaze B2 CLI

If you have the B2 CLI installed, you can use this command:

```bash
b2 update-bucket \
  --corsRules '[
    {
      "corsRuleName": "allowUploads",
      "allowedOrigins": [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002"
      ],
      "allowedOperations": [
        "s3_put",
        "s3_get",
        "s3_head",
        "b2_upload_file",
        "b2_download_file_by_name"
      ],
      "allowedHeaders": ["*"],
      "exposeHeaders": [
        "x-amz-request-id",
        "x-amz-id-2",
        "ETag"
      ],
      "maxAgeSeconds": 3600
    }
  ]' \
  Mongolec allPublic
```

### Method 3: Using AWS CLI (S3 Compatible)

```bash
aws s3api put-bucket-cors \
  --bucket Mongolec \
  --endpoint-url https://s3.us-west-004.backblazeb2.com \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedOrigins": [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:3002"
        ],
        "AllowedMethods": ["PUT", "GET", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": [
          "ETag",
          "x-amz-request-id",
          "x-amz-id-2"
        ],
        "MaxAgeSeconds": 3600
      }
    ]
  }'
```

## For Production

When you deploy to production, add your production domain to the allowed origins:

```json
"allowedOrigins": [
  "http://localhost:3000",
  "https://your-production-domain.com",
  "https://www.your-production-domain.com"
]
```

## Testing

After configuring CORS:

1. Wait a few minutes for the changes to propagate
2. Try uploading an image again
3. Check the browser console - the CORS error should be gone

## Verification

You can verify CORS is working by checking the response headers in your browser's Network tab:

- Look for `Access-Control-Allow-Origin: http://localhost:3000`
- The OPTIONS preflight request should return 200 OK
