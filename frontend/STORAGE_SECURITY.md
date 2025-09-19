# Google Cloud Storage Security Implementation

## Overview

This implementation provides a secure, production-ready Google Cloud Storage integration for the Samudra Sahayak emergency reporting system. The storage system uses **private buckets with signed URLs** instead of public file access, ensuring better security and access control.

## Key Security Features

### 🔒 Private Bucket Architecture

- No public read access to files
- All files accessible only via signed URLs
- Automatic expiration of access URLs
- No permanent public URLs exposed

### 🛡️ Access Control

- Authentication required for all upload operations
- Guest users cannot upload files
- Role-based file organization
- User-specific metadata tracking

### 📁 File Organization

Files are automatically organized in the following structure:

```
bucket/
├── images/
│   └── user-{userId}/
│       └── report-{reportId}/
│           └── {filename}-{timestamp}-{random}.{ext}
├── videos/
│   └── user-{userId}/
│       └── report-{reportId}/
│           └── {filename}-{timestamp}-{random}.{ext}
└── documents/
    └── user-{userId}/
        └── report-{reportId}/
            └── {filename}-{timestamp}-{random}.{ext}
```

## Functions Available

### Core Functions

#### `generateSignedUploadUrl(fileName, contentType, options)`

Creates a signed URL for client-side uploads directly to GCS.

**Parameters:**

- `fileName`: Original filename
- `contentType`: MIME type
- `options`: Configuration object
  - `expiresIn`: URL expiry in minutes (default: 15)
  - `userId`: User ID for organization
  - `reportId`: Report ID for organization
  - `category`: File category (images/videos/documents)
  - `metadata`: Additional metadata

**Returns:**

```javascript
{
  uploadUrl: "https://storage.googleapis.com/...",
  fileName: "images/user-123/report-456/photo-1641234567890-abc123def.jpg",
  downloadUrl: "https://storage.googleapis.com/...",
  metadata: { ... }
}
```

#### `generateSignedDownloadUrl(fileName, expiresIn)`

Creates a signed URL for downloading files from private bucket.

**Parameters:**

- `fileName`: File name in GCS
- `expiresIn`: URL expiry in minutes (default: 60)

**Returns:** Signed download URL string

#### `uploadFileServer(fileBuffer, fileName, contentType, options)`

Server-side upload for small files (< 10MB recommended).

**Parameters:**

- `fileBuffer`: File buffer data
- `fileName`: Original filename
- `contentType`: MIME type
- `options`: Upload configuration

**Returns:**

```javascript
{
  fileName: "generated-unique-filename",
  downloadUrl: "signed-download-url",
  metadata: { ... }
}
```

### Utility Functions

#### `validateFile(contentType, size, options)`

Validates file type and size before upload.

**Supported File Types:**

- **Images:** JPEG, PNG, WebP, GIF
- **Videos:** MP4, WebM, AVI, QuickTime
- **Documents:** PDF, TXT, DOC, DOCX

**Size Limits:**

- Default: 100MB max
- Videos: 500MB max (with warning for resumable upload)
- Minimum: 1KB

#### `deleteFile(fileName)`

Safely delete files from GCS.

#### `fileExists(fileName)`

Check if a file exists in the bucket.

#### `getFileMetadata(fileName)`

Retrieve file metadata and information.

#### `generateMultipleDownloadUrls(fileNames, expiresIn)`

Generate signed URLs for multiple files efficiently.

#### `cleanupOldFiles(prefix, maxAge)`

Utility for cleaning up expired or orphaned files.

## API Endpoints

### Upload Endpoints

#### `POST /api/upload/signed-url`

Generate signed upload URL for client-side uploads.

**Request:**

```javascript
{
  "fileName": "emergency-photo.jpg",
  "contentType": "image/jpeg",
  "fileSize": 2048576,
  "fileCategory": "images"
}
```

**Response:**

```javascript
{
  "uploadUrl": "https://storage.googleapis.com/...",
  "downloadUrl": "https://storage.googleapis.com/...",
  "fileName": "images/user-123/emergency-photo-1641234567890-abc123def.jpg",
  "expiresIn": 900,
  "metadata": { ... }
}
```

#### `POST /api/upload/refresh-urls`

Refresh expired signed URLs.

**Request:**

```javascript
{
  "fileName": "images/user-123/photo.jpg",
  "expiresIn": 60
}
```

Or for multiple files:

```javascript
{
  "fileNames": ["file1.jpg", "file2.mp4"],
  "expiresIn": 60
}
```

#### `POST /api/upload/test` (Admin/Officials only)

Test storage configuration and validation.

## Environment Configuration

### Required Environment Variables

```bash
# Google Cloud Storage
GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Optional - for development
GOOGLE_CLOUD_KEYFILE=path/to/service-account-key.json
```

### Production Setup (Recommended)

For production deployments on Google Cloud Platform:

1. **Use Application Default Credentials (ADC)**

   - Deploy on Cloud Run, GKE, or Compute Engine
   - ADC automatically handles authentication
   - No need for service account key files

2. **Service Account Permissions**

   ```bash
   # Required roles for the service account:
   - Storage Object Admin (for bucket operations)
   - Storage Legacy Bucket Reader (for bucket metadata)
   ```

3. **Bucket Configuration**

   ```bash
   # Create private bucket
   gsutil mb gs://your-bucket-name

   # Remove public access
   gsutil iam ch -d allUsers:objectViewer gs://your-bucket-name
   gsutil iam ch -d allAuthenticatedUsers:objectViewer gs://your-bucket-name

   # Set uniform bucket-level access
   gsutil uniformbucketlevelaccess set on gs://your-bucket-name
   ```

### Development Setup

1. **Create Service Account Key**

   ```bash
   gcloud iam service-accounts keys create key.json \
     --iam-account=your-service-account@project.iam.gserviceaccount.com
   ```

2. **Set Environment Variable**
   ```bash
   export GOOGLE_CLOUD_KEYFILE=./path/to/key.json
   ```

## Security Best Practices

### ✅ Implemented

- Private bucket with no public access
- Signed URLs with automatic expiration
- File type and size validation
- Unique filename generation to prevent collisions
- User-based file organization and metadata
- Rate limiting on upload endpoints
- Authentication required for all operations

### 🔒 Additional Security Measures

- Files are organized by user and report for access control
- Metadata includes uploader information for audit trails
- Failed upload attempts are logged
- Regular cleanup of expired/orphaned files
- No permanent public URLs to prevent unauthorized access

## Usage Examples

### Client-Side Upload Flow

```javascript
// 1. Get signed upload URL
const response = await fetch('/api/upload/signed-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'emergency-photo.jpg',
    contentType: 'image/jpeg',
    fileSize: file.size,
    fileCategory: 'images',
  }),
});

const { uploadUrl, downloadUrl, fileName } = await response.json();

// 2. Upload file directly to GCS
const uploadResponse = await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': 'image/jpeg' },
});

// 3. File is now uploaded and accessible via downloadUrl
console.log('File uploaded:', fileName);
console.log('Access URL:', downloadUrl);
```

### Server-Side File Access

```javascript
import { generateSignedDownloadUrl } from '@/lib/storage';

// Generate fresh download URL for existing file
const downloadUrl = await generateSignedDownloadUrl(
  'images/user-123/report-456/photo.jpg',
  60 // expires in 60 minutes
);
```

## Migration from Public URLs

If migrating from a public bucket setup:

1. **Update bucket permissions** to remove public access
2. **Replace public URL references** with signed URL generation
3. **Update frontend code** to refresh URLs when they expire
4. **Test thoroughly** to ensure all file access works correctly

## Monitoring and Maintenance

### Storage Metrics to Monitor

- Upload success/failure rates
- File size distribution
- Storage usage growth
- URL generation frequency
- Failed access attempts

### Regular Maintenance

- Run `cleanupOldFiles()` periodically to remove expired files
- Monitor storage costs and usage patterns
- Review and rotate service account keys (if used)
- Update signed URL expiration times based on usage patterns

## Error Handling

The implementation includes comprehensive error handling:

- **File validation errors**: Clear messages about file type/size issues
- **Authentication errors**: Proper HTTP status codes
- **Storage errors**: Graceful handling of GCS API failures
- **Network errors**: Retry logic for transient failures

Common error scenarios:

- Invalid file types → 400 Bad Request with validation details
- File too large → 400 Bad Request with size limits
- Authentication failure → 401 Unauthorized
- Storage service unavailable → 500 Internal Server Error with retry suggestion

---

## Support

For issues or questions about the storage implementation:

1. Check the API test endpoint: `POST /api/upload/test`
2. Review server logs for detailed error messages
3. Verify environment configuration
4. Ensure proper Google Cloud authentication setup
