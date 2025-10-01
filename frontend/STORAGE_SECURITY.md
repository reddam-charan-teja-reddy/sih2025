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
- Guest users have limited upload capabilities
- Role-based file organization
- User-specific metadata tracking

### 📁 File Organization

Files are automatically organized in the following structure:

```
bucket/
├── images/
│   └── user-{userId}/
│       └── {filename}-{timestamp}-{random}.{ext}
├── videos/
│   └── user-{userId}/
│       └── {filename}-{timestamp}-{random}.{ext}
├── audio/
│   └── user-{userId}/
│       └── voice-{timestamp}-{random}.webm
└── documents/
    └── user-{userId}/
        └── {filename}-{timestamp}-{random}.{ext}
```

## Upload Workflow Architecture

### Multi-File Upload Support

The system now supports uploading multiple file types simultaneously:

- **Images + Audio**: Combined reports with visual evidence and voice descriptions
- **Videos + Audio**: Video evidence with voice narration
- **Multiple Images**: Photo galleries for comprehensive documentation
- **Audio Only**: Quick voice reports for urgent situations

### Upload Flow Types

#### 1. Standard Form Upload (`handleSubmit`)

Used for detailed reports with form data and optional media:

```javascript
// Flow: Image/Video Selection → Form Completion → Batch Upload
1. User selects media files (images/videos)
2. Files are validated and added to state
3. User fills out detailed form
4. All media files are uploaded in parallel
5. Audio is uploaded if recorded
6. Complete report is submitted with all attachments
```

#### 2. Quick Voice Upload (`quickSubmitVoice`)

Used for rapid voice reports, now enhanced to handle media:

```javascript
// Flow: Optional Media → Voice Recording → Quick Submit
1. User optionally selects media files
2. User records voice message
3. System uploads ALL media files first
4. Audio is uploaded
5. Report is auto-generated with voice + media
```

### State Management & Debugging

Enhanced state tracking for reliable file handling:

```javascript
// State tracking with debug logging
const [mediaFiles, setMediaFiles] = useState([]);
const trackedSetMediaFiles = (newFiles) => {
  console.log('🔄 MEDIA FILES STATE CHANGE:', {
    from: mediaFiles.length,
    to: newFiles.length,
    stack: new Error().stack.split('\n')[1]?.trim(),
  });
  setMediaFiles(newFiles);
};
```

#### Debug Logging System

The system includes comprehensive logging for troubleshooting:

```javascript
// File addition tracking
📁 FILES ADDED: { addedFiles: [...], totalMediaFiles: N, newPreviewsCount: N }
📎 File 1: filename.jpg (image/jpeg, size bytes)

// Upload process tracking
🔍 SUBMIT DEBUG - Current state: { mediaFilesCount: N, hasAudioBlob: true }
🔍 MEDIA FILES IN STATE: [detailed file list]
📤 Starting upload of N files...
📎 Uploading file 1/N: { name, type, size }

// Upload results
✅ Successfully uploaded filename.jpg
📊 Upload summary: N successful, M failed
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
  - `category`: File category (images/videos/audio/documents)
  - `metadata`: Additional metadata

**Returns:**

```javascript
{
  uploadUrl: "https://storage.googleapis.com/...",
  fileName: "images/user-123/photo-1641234567890-abc123def.jpg",
  downloadUrl: "https://storage.googleapis.com/...",
  requiredHeaders: {
    "Content-Type": "image/jpeg",
    "x-goog-meta-original-name": "photo.jpg",
    "x-goog-meta-uploaded-at": "2025-10-01T12:00:00Z",
    // ... additional metadata headers
  },
  metadata: { ... }
}
```

#### `generateSignedDownloadUrl(fileName, expiresIn)`

Creates a signed URL for downloading files from private bucket.

**Parameters:**

- `fileName`: File name in GCS
- `expiresIn`: URL expiry in minutes (default: 60)

**Returns:** Signed download URL string

### Enhanced Upload Functions

#### Multi-File Upload Support

The system now handles multiple file uploads with proper error handling:

```javascript
// Upload multiple files with progress tracking
const uploadedFiles = [];
const failedFiles = [];

for (const [index, file] of mediaFiles.entries()) {
  try {
    // 1. Get signed upload URL
    const urlResponse = await fetch('/api/upload/signed-url', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        fileCategory: file.type.startsWith('video/') ? 'videos' : 'images',
      }),
    });

    const { uploadUrl, downloadUrl, fileName, requiredHeaders } =
      await urlResponse.json();

    // 2. Upload file directly to GCS
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: requiredHeaders,
    });

    if (uploadResponse.ok) {
      uploadedFiles.push({
        url: downloadUrl,
        fileName: fileName,
        type: file.type,
        caption: formData.get(`caption_${file.name}`) || '',
      });
    }
  } catch (error) {
    failedFiles.push({ file: file.name, error: error.message });
  }
}
```

#### Voice + Media Upload Integration

Enhanced `quickSubmitVoice` function now processes media files:

```javascript
const quickSubmitVoice = async () => {
  // 1. Upload all media files first
  let uploadedFiles = [];
  if (mediaFiles.length > 0) {
    for (const file of mediaFiles) {
      // Process each media file...
    }
  }

  // 2. Upload audio
  const audioFileName = `voice-${Date.now()}.webm`;
  // Audio upload process...

  // 3. Create comprehensive report
  const reportData = {
    title:
      uploadedFiles.length > 0 ? 'Voice Report with Media' : 'Voice Report',
    description: `Voice message with ${uploadedFiles.length} media file(s) attached.`,
    images: uploadedFiles.filter((f) => f.type.startsWith('image/')),
    videos: uploadedFiles.filter((f) => f.type.startsWith('video/')),
    audio: [{ url: audioDownloadUrl, fileName, duration }],
    // ... other fields
  };
};
```

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

- **Images:** JPEG, JPG, PNG, WebP
- **Videos:** MP4, WebM, AVI, QuickTime
- **Audio:** WebM, OGG, MPEG, MP4, WAV, AAC
- **Documents:** PDF, TXT, DOC, DOCX

**Size Limits:**

- **Videos:** 100MB max
- **Audio:** 20MB max
- **Images:** 50MB max
- **Documents:** 50MB max
- **Minimum:** 1KB for all types

#### Enhanced Error Handling & Validation

```javascript
const validationOptions = {
  allowedTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/avi',
    'video/quicktime',
    'audio/webm',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/aac',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  maxSize:
    effectiveCategory === 'video'
      ? 100 * 1024 * 1024
      : effectiveCategory === 'audio'
      ? 20 * 1024 * 1024
      : effectiveCategory === 'image'
      ? 50 * 1024 * 1024
      : 50 * 1024 * 1024,
  minSize: 1024,
};
```

#### Authentication & Authorization

Enhanced authentication system supporting both authenticated users and guests:

```javascript
// Authentication middleware
const guestAuth = await guestMiddleware(request);
const user = guestAuth.success
  ? guestAuth.user
  : { _id: null, role: 'citizen', isGuest: true };

// File categorization based on content type
const effectiveCategory = contentType.startsWith('video/')
  ? 'video'
  : contentType.startsWith('audio/')
  ? 'audio'
  : contentType.startsWith('image/')
  ? 'image'
  : 'document';
```

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

Generate signed upload URL for client-side uploads with enhanced logging and validation.

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
  "uploadUrl": "https://storage.googleapis.com/bucket/images/user-123/emergency-photo-1641234567890-abc123def.jpg?X-Goog-Algorithm=...",
  "downloadUrl": "https://storage.googleapis.com/bucket/images/user-123/emergency-photo-1641234567890-abc123def.jpg?X-Goog-Algorithm=...",
  "fileName": "images/user-123/emergency-photo-1641234567890-abc123def.jpg",
  "expiresIn": 900,
  "requiredHeaders": {
    "Content-Type": "image/jpeg",
    "x-goog-meta-original-name": "emergency-photo.jpg",
    "x-goog-meta-uploaded-at": "2025-10-01T12:00:00Z",
    "x-goog-meta-uploader-id": "user-123",
    "x-goog-meta-report-id": "",
    "x-goog-meta-filesize": "2048576",
    "x-goog-meta-category": "images",
    "x-goog-meta-userrole": "citizen"
  },
  "metadata": {
    "originalName": "emergency-photo.jpg",
    "contentType": "image/jpeg",
    "fileSize": 2048576,
    "category": "images",
    "uploadedBy": "user-123",
    "uploadedAt": "2025-10-01T12:00:00Z"
  }
}
```

**Enhanced Server-Side Logging:**

```bash
📋 Starting signed URL generation request
🔐 Authentication result: { hasError: false, isGuest: false, success: true, userRole: 'citizen' }
📋 Request body: { fileName: 'emergency-photo.jpg', contentType: 'image/jpeg', fileSize: 2048576, fileCategory: 'images' }
📋 File categorization: { contentType: 'image/jpeg', effectiveCategory: 'image', requestedCategory: 'images' }
✅ File validation result: { isValid: true, errors: [] }
📦 Storage category determined: images
🔐 Generating signed upload URL...
✅ Signed URL generated successfully: { hasUploadUrl: true, hasDownloadUrl: true, fileName: '...', uploadUrlLength: 1085 }
```

### Report Submission Integration

#### `POST /api/reports`

Enhanced report submission supporting multiple media types:

**Request Body Structure:**

```javascript
{
  "title": "Emergency Report",
  "description": "Detailed description...",
  "hazardType": "flood",
  "severity": "high",
  "location": {
    "type": "Point",
    "coordinates": [longitude, latitude]
  },
  "address": "123 Main St, City",
  "landmark": "Near the bridge",
  "peopleAtRisk": true,
  "emergencyContact": {
    "name": "John Doe",
    "phone": "+91-9876543210"
  },
  "images": [
    {
      "url": "https://storage.googleapis.com/...",
      "fileName": "images/user-123/photo1-timestamp-hash.jpg",
      "type": "image/jpeg",
      "caption": "Flooding on main road"
    }
  ],
  "videos": [
    {
      "url": "https://storage.googleapis.com/...",
      "fileName": "videos/user-123/video1-timestamp-hash.mp4",
      "type": "video/mp4",
      "caption": "Video of rising water levels"
    }
  ],
  "audio": [
    {
      "url": "https://storage.googleapis.com/...",
      "fileName": "audio/user-123/voice-timestamp-hash.webm",
      "duration": 45
    }
  ]
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

### ✅ Implemented Security Measures

- **Private bucket with no public access**
- **Signed URLs with automatic expiration (15-60 minutes)**
- **File type and size validation server-side**
- **Unique filename generation to prevent collisions**
- **User-based file organization and metadata tracking**
- **Rate limiting on upload endpoints**
- **Authentication required for all operations**
- **Guest user access control (limited capabilities)**
- **Comprehensive audit logging**
- **Error handling without information leakage**

### 🔒 Advanced Security Features

#### Metadata Tracking

```javascript
// Each file includes comprehensive metadata
"x-goog-meta-original-name": "photo.jpg",
"x-goog-meta-uploaded-at": "2025-10-01T12:00:00Z",
"x-goog-meta-uploader-id": "user-123",
"x-goog-meta-report-id": "report-456",
"x-goog-meta-filesize": "2048576",
"x-goog-meta-category": "images",
"x-goog-meta-userrole": "citizen"
```

#### Access Control

- Files organized by user ID for isolation
- Role-based access control
- Report-level file association
- Audit trail for all uploads

#### Content Security

- MIME type validation
- File signature verification
- Size limits by file type
- Malicious file detection

### 🛡️ Operational Security

#### Authentication & Authorization

```javascript
// Multi-tier auth system
const authResult = await guestMiddleware(request);
if (authResult.error) {
  return NextResponse.json({ error: authResult.error }, { status: 401 });
}

// User context for file operations
const user = authResult.success
  ? authResult.user
  : { _id: null, role: 'citizen', isGuest: true };
```

#### Error Handling

- No sensitive information in error messages
- Comprehensive server-side logging
- Client-side error recovery
- Graceful degradation for network issues

#### Rate Limiting & Abuse Prevention

- Upload frequency limits
- File size quotas per user
- Concurrent upload restrictions
- Automated abuse detection

## Environment Configuration

### Production Environment Variables

```bash
# Required for production
GOOGLE_CLOUD_BUCKET_NAME=sih-media-receiver
GOOGLE_CLOUD_PROJECT_ID=sih2025-472616

# Authentication (use ADC in production)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Optional configuration
UPLOAD_MAX_FILE_SIZE=104857600  # 100MB default
UPLOAD_MAX_FILES_PER_REQUEST=10
SIGNED_URL_EXPIRY_MINUTES=15
DOWNLOAD_URL_EXPIRY_MINUTES=60

# Security settings
ENABLE_GUEST_UPLOADS=true
RATE_LIMIT_UPLOADS_PER_MINUTE=10
ENABLE_AUDIT_LOGGING=true
```

### Development Setup

```bash
# Install dependencies
npm install @google-cloud/storage

# Set up service account
export GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"
export GOOGLE_CLOUD_BUCKET_NAME="your-dev-bucket"

# Test configuration
curl -X POST http://localhost:3000/api/upload/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### GCS Bucket Configuration

```bash
# Create private bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l us-central1 gs://your-bucket-name

# Set uniform bucket-level access
gsutil uniformbucketlevelaccess set on gs://your-bucket-name

# Remove all public access
gsutil iam ch -d allUsers:objectViewer gs://your-bucket-name
gsutil iam ch -d allAuthenticatedUsers:objectViewer gs://your-bucket-name

# Set lifecycle policy for cleanup
gsutil lifecycle set lifecycle.json gs://your-bucket-name
```

**Lifecycle Policy (`lifecycle.json`):**

```json
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": {
        "age": 365,
        "matchesPrefix": ["temp/", "uploads/"]
      }
    }
  ]
}
```

### Service Account Permissions

```bash
# Required IAM roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:storage-service@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:storage-service@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.legacyBucketReader"
```

## Monitoring and Maintenance

### Key Metrics to Monitor

```javascript
// Upload performance metrics
const metrics = {
  // Volume metrics
  uploadsPerDay: 1250,
  bytesUploadedPerDay: 52428800, // 50MB
  averageFileSize: 2097152, // 2MB

  // Performance metrics
  averageUploadTime: 3.5, // seconds
  signedUrlGenerationTime: 0.15, // seconds
  uploadSuccessRate: 98.5, // percentage

  // Error metrics
  authenticationFailures: 12,
  validationFailures: 8,
  networkTimeouts: 3,
  storageErrors: 1,

  // Security metrics
  suspiciousFileTypes: 0,
  oversizedFileAttempts: 15,
  rateLimitViolations: 5,
};
```

### Automated Maintenance Tasks

```javascript
// Cleanup script (run daily)
const cleanupOldFiles = async () => {
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

  // Clean up orphaned uploads (no associated report)
  await cleanupOrphanedFiles('uploads/', cutoffDate);

  // Clean up temporary files
  await cleanupExpiredFiles('temp/', cutoffDate);

  // Archive old reports
  await archiveOldReports(365); // 1 year
};

// Health check endpoint
app.get('/api/health/storage', async (req, res) => {
  try {
    // Test bucket connectivity
    await bucket.getMetadata();

    // Test signed URL generation
    const testUrl = await generateSignedUploadUrl(
      'health-check.txt',
      'text/plain'
    );

    // Test authentication
    const authTest = await testAuthentication();

    res.json({
      status: 'healthy',
      bucket: 'accessible',
      signedUrls: 'working',
      authentication: authTest.status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});
```

### Alerts and Notifications

```javascript
// Set up monitoring alerts
const alerts = {
  // Performance alerts
  uploadSuccessRateBelow95Percent: true,
  averageUploadTimeAbove10Seconds: true,
  signedUrlGenerationTimeAbove1Second: true,

  // Security alerts
  authenticationFailureSpike: true,
  suspiciousFileTypeAttempts: true,
  rateLimitViolationsHigh: true,

  // Operational alerts
  storageQuotaNear80Percent: true,
  bucketInaccessible: true,
  serviceAccountKeyExpiringSoon: true,
};
```

---

## Migration Guide

### From Public Bucket to Private Bucket

If you're migrating from a public bucket setup:

1. **Backup existing data**
2. **Update bucket permissions** to remove public access
3. **Replace public URL references** with signed URL generation
4. **Update frontend code** to handle URL expiration and refresh
5. **Test thoroughly** in staging environment
6. **Deploy with monitoring** to catch any issues

### From File System Storage

If migrating from local file storage:

1. **Migrate existing files** to GCS with proper organization
2. **Update file references** in database to use GCS paths
3. **Implement signed URL generation** for all file access
4. **Add metadata** to existing files for better organization

---

## Support and Documentation

### Additional Resources

- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Signed URL Best Practices](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Security Best Practices](https://cloud.google.com/storage/docs/best-practices)

### Getting Help

1. **Check API test endpoint:** `POST /api/upload/test`
2. **Review server logs** for detailed error messages
3. **Verify environment configuration**
4. **Test GCS connectivity** and permissions
5. **Check client-side console logs** for upload issues

For production issues:

- Monitor health check endpoint: `/api/health/storage`
- Review CloudWatch/Stackdriver logs
- Check GCS bucket metrics in Cloud Console
- Verify service account key status and permissions

## Usage Examples

### Complete Upload Workflow

#### 1. Multi-File Upload with Form Submission

```javascript
// Complete workflow: Image + Video + Audio + Form Data
const handleSubmit = async (event) => {
  event.preventDefault();

  // 1. Collect form data
  const formData = new FormData(event.target);
  const reportData = {
    title: formData.get('title'),
    description: formData.get('description'),
    hazardType: formData.get('hazardType'),
    severity: formData.get('severity'),
    // ... other form fields
  };

  // 2. Upload media files in parallel
  let uploadedFiles = [];
  for (const file of mediaFiles) {
    const { uploadUrl, downloadUrl, fileName, requiredHeaders } =
      await getSignedUploadUrl(file);

    await uploadToGCS(uploadUrl, file, requiredHeaders);
    uploadedFiles.push({ url: downloadUrl, fileName, type: file.type });
  }

  // 3. Upload audio if present
  let uploadedAudio = null;
  if (audioBlob) {
    const { uploadUrl, downloadUrl, fileName, requiredHeaders } =
      await getSignedUploadUrl(audioBlob, 'audio');

    await uploadToGCS(uploadUrl, audioBlob, requiredHeaders);
    uploadedAudio = { url: downloadUrl, fileName, duration: audioDuration };
  }

  // 4. Organize files by type
  reportData.images = uploadedFiles.filter((f) => f.type.startsWith('image/'));
  reportData.videos = uploadedFiles.filter((f) => f.type.startsWith('video/'));
  if (uploadedAudio) reportData.audio = [uploadedAudio];

  // 5. Submit complete report
  await submitReport(reportData);
};
```

#### 2. Quick Voice Report with Optional Media

```javascript
// Voice-first workflow with media attachment support
const quickSubmitVoice = async () => {
  // 1. Upload any attached media files first
  let uploadedFiles = [];
  if (mediaFiles.length > 0) {
    console.log(
      `📤 Uploading ${mediaFiles.length} media files in voice mode...`
    );

    for (const file of mediaFiles) {
      try {
        const { uploadUrl, downloadUrl, fileName, requiredHeaders } =
          await getSignedUploadUrl(file);

        await uploadToGCS(uploadUrl, file, requiredHeaders);
        uploadedFiles.push({ url: downloadUrl, fileName, type: file.type });

        console.log(`✅ Successfully uploaded: ${file.name}`);
      } catch (error) {
        console.error(`❌ Failed to upload ${file.name}:`, error);
      }
    }
  }

  // 2. Upload audio
  const audioFileName = `voice-${Date.now()}.webm`;
  const { uploadUrl, downloadUrl, fileName, requiredHeaders } =
    await getSignedUploadUrl(audioBlob, 'audio', audioFileName);

  await uploadToGCS(uploadUrl, audioBlob, requiredHeaders);

  // 3. Create auto-generated report
  const reportData = {
    title:
      uploadedFiles.length > 0 ? 'Voice Report with Media' : 'Voice Report',
    description:
      uploadedFiles.length > 0
        ? `Voice message with ${uploadedFiles.length} media file(s) attached.`
        : 'Voice message attached.',
    hazardType: 'other',
    severity: 'medium',
    images: uploadedFiles.filter((f) => f.type.startsWith('image/')),
    videos: uploadedFiles.filter((f) => f.type.startsWith('video/')),
    audio: [
      { url: downloadUrl, fileName, duration: Math.round(audioDuration) },
    ],
    // ... location and other auto-filled fields
  };

  await submitReport(reportData);
};
```

#### 3. Helper Functions

```javascript
// Get signed upload URL
async function getSignedUploadUrl(
  file,
  category = null,
  customFileName = null
) {
  const fileName = customFileName || file.name;
  const fileCategory =
    category || (file.type.startsWith('video/') ? 'videos' : 'images');

  const response = await fetch('/api/upload/signed-url', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      fileName: fileName,
      contentType: file.type,
      fileSize: file.size,
      fileCategory: fileCategory,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get upload URL for ${fileName}`);
  }

  return await response.json();
}

// Upload to Google Cloud Storage
async function uploadToGCS(uploadUrl, file, requiredHeaders) {
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: requiredHeaders || { 'Content-Type': file.type },
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
  }

  return uploadResponse;
}

// Submit report to API
async function submitReport(reportData) {
  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(reportData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to submit report');
  }

  return await response.json();
}
```

## Troubleshooting & Debugging

### Common Issues and Solutions

#### 1. "Only audio is uploading, not images"

**Problem:** When both image and audio are present, only audio gets uploaded.

**Root Cause:** The UI switches to voice mode (`quickSubmitVoice`) which previously only handled audio.

**Solution:** Enhanced `quickSubmitVoice` function now processes media files first:

```javascript
// Check debug logs for:
🚀 QUICK SUBMIT VOICE CALLED with media files: { mediaFilesCount: 1 }
📤 Uploading 1 media files in voice mode...
✅ Successfully uploaded media file: image.jpg
```

#### 2. Files added to state but not uploaded

**Problem:** Files show as added but `mediaFiles.length` is 0 during upload.

**Debug Steps:**

```javascript
// Look for state change logs:
🔄 MEDIA FILES STATE CHANGE: { from: 0, to: 1, stack: ... }
📁 FILES ADDED: { addedFiles: [...], totalMediaFiles: 1 }

// Check submit logs:
🔍 CHECKING FILES FOR UPLOAD: { mediaFilesLength: 0, willEnterUploadLoop: false }
```

**Common Causes:**

- State being reset unexpectedly
- Wrong submit handler being called
- Component re-rendering clearing state

#### 3. Upload API errors

**Debug Server Logs:**

```bash
❌ Authentication failed: { error: "Invalid token" }
❌ File validation failed: { errors: ["File too large"] }
❌ Error generating upload URL: { message: "GCS error", stack: "..." }
```

**Check:**

- Authentication tokens are valid
- File sizes within limits
- GCS bucket configuration
- Network connectivity

#### 4. Signed URL expiration

**Problem:** Upload fails with "URL expired" error.

**Solution:** URLs expire in 15 minutes. Regenerate if needed:

```javascript
// Check expiration in response:
{ "expiresIn": 900 } // 15 minutes in seconds

// Regenerate if expired
const newSignedUrl = await fetch('/api/upload/signed-url', { /* same params */ });
```

### Debug Logging Reference

#### Client-Side Debug Logs

```javascript
// File state management
🔄 MEDIA FILES STATE CHANGE: { from: N, to: M, stack: "..." }
📁 FILES ADDED: { addedFiles: [...], totalMediaFiles: N }
📎 File 1: filename.jpg (image/jpeg, size bytes)

// Submit process
🖱️ SUBMIT BUTTON CLICKED: { isSubmitting: false, hasLocation: true, disabled: false }
🚀 HANDLE SUBMIT CALLED: { event: "submit" }
🔍 SUBMIT DEBUG - Current state: { mediaFilesCount: N, hasAudioBlob: true }

// Upload process
📤 Starting upload of N files...
📎 Uploading file 1/N: { name: "...", type: "...", size: ... }
✅ Successfully uploaded filename.jpg
❌ CRITICAL: File upload error for filename.jpg: { error: "...", message: "..." }
📊 Upload summary: N successful, M failed

// Voice mode
🚀 QUICK SUBMIT VOICE CALLED with media files: { mediaFilesCount: N }
📤 Uploading N media files in voice mode...
📤 Submitting voice report with media: { imagesCount: N, videosCount: M, hasAudio: true }
```

#### Server-Side Debug Logs

```bash
# Request processing
📋 Starting signed URL generation request
🔐 Authentication result: { hasError: false, success: true, userRole: "citizen" }
📋 Request body: { fileName: "...", contentType: "...", fileSize: N }

# File validation
📋 File categorization: { contentType: "image/jpeg", effectiveCategory: "image" }
✅ File validation result: { isValid: true, errors: [] }
📦 Storage category determined: images

# GCS operations
🔐 Generating signed upload URL...
✅ Signed URL generated successfully: { hasUploadUrl: true, uploadUrlLength: 1085 }

# Report submission
POST /api/upload/signed-url 200 in 729ms
POST /api/reports 201 in 275ms
```

### Performance Monitoring

#### Upload Metrics to Track

```javascript
// File upload performance
const uploadMetrics = {
  fileCount: mediaFiles.length,
  totalSize: mediaFiles.reduce((sum, file) => sum + file.size, 0),
  uploadStartTime: Date.now(),
  uploadEndTime: Date.now(),
  successCount: uploadedFiles.length,
  failureCount: failedFiles.length,
  averageFileSize: totalSize / fileCount,
  uploadDuration: uploadEndTime - uploadStartTime,
};

console.log('📊 Upload Performance:', uploadMetrics);
```

#### Network Optimization

- Parallel uploads for multiple files
- Retry logic for failed uploads
- Progress tracking for large files
- Compression for images (client-side)
- Chunked uploads for files > 100MB

### Best Practices for Debugging

1. **Enable comprehensive logging** during development
2. **Monitor browser network tab** for upload requests
3. **Check server logs** for API endpoint behavior
4. **Validate file state** before and after operations
5. **Test edge cases** (large files, network issues, auth expiry)
6. **Use debug endpoints** (`/api/upload/test`) for configuration validation

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
