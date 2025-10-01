import { Storage } from '@google-cloud/storage';
import crypto from 'crypto';

// Initialize Google Cloud Storage with Application Default Credentials support
let storage, bucket;

/**
 * Check if Google Cloud Storage is properly configured
 * @returns {boolean} True if storage is configured
 */
const isStorageConfigured = () => {
  const isConfigured = !!(
    storage &&
    bucket &&
    process.env.GOOGLE_CLOUD_BUCKET_NAME
  );
  console.log('🔍 Storage configuration check:', {
    hasStorage: !!storage,
    hasBucket: !!bucket,
    bucketName: process.env.GOOGLE_CLOUD_BUCKET_NAME || 'not set',
    isConfigured,
  });
  return isConfigured;
};

try {
  // Build Storage options that support either a file path or raw JSON in env
  const storageOptions = {};

  const keyEnv =
    process.env.GOOGLE_CLOUD_KEYFILE ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyEnv) {
    // If the env contains JSON, parse it and use credentials; otherwise treat it as a path
    const isJsonLike = keyEnv.trim().startsWith('{');
    if (isJsonLike) {
      try {
        const keyObj = JSON.parse(keyEnv);
        const private_key = (keyObj.private_key || '').replace(/\\n/g, '\n');
        storageOptions.projectId =
          process.env.GOOGLE_CLOUD_PROJECT_ID || keyObj.project_id;
        storageOptions.credentials = {
          client_email: keyObj.client_email,
          private_key,
        };
      } catch (e) {
        console.warn(
          'Invalid JSON in GOOGLE_CLOUD_KEYFILE; falling back to ADC if available.'
        );
      }
    } else {
      storageOptions.keyFilename = keyEnv; // file path
      if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
        storageOptions.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      }
    }
  } else if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
    // Allow setting only projectId if relying on ADC on the machine
    storageOptions.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  }

  storage = new Storage(storageOptions);
  console.log('⚙️ GCS Storage initialized with options:', {
    hasProjectId: !!storageOptions.projectId,
    hasCredentials: !!storageOptions.credentials,
    hasKeyFilename: !!storageOptions.keyFilename,
    projectId: storageOptions.projectId || 'not set',
  });

  // Only initialize bucket if bucket name is provided
  if (process.env.GOOGLE_CLOUD_BUCKET_NAME) {
    bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME);
    console.log(
      '📦 GCS Bucket initialized:',
      process.env.GOOGLE_CLOUD_BUCKET_NAME
    );
  } else if (process.env.NODE_ENV !== 'test') {
    console.warn(
      'GOOGLE_CLOUD_BUCKET_NAME not set. Storage functions will not work.'
    );
  }
} catch (error) {
  console.error('Failed to initialize Google Cloud Storage:', error);
  if (process.env.NODE_ENV !== 'test') {
    console.warn(
      'Storage functions will not work without proper GCS configuration.'
    );
  }
}

/**
 * Generate a unique filename with optional prefixes to avoid collisions
 * @param {string} originalName - Original filename
 * @param {Object} options - Options for filename generation
 * @param {string} options.userId - User ID prefix
 * @param {string} options.reportId - Report ID prefix
 * @param {string} options.category - File category (images, videos, documents)
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalName, options = {}) => {
  const { userId, reportId, category = 'files' } = options;
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');

  // Create path segments
  const pathSegments = [category];
  if (userId) pathSegments.push(`user-${userId}`);
  if (reportId) pathSegments.push(`report-${reportId}`);

  // Generate unique filename
  const uniqueName = `${nameWithoutExt}-${timestamp}-${randomSuffix}.${extension}`;

  return `${pathSegments.join('/')}/${uniqueName}`;
};

/**
 * Validate file type, size, and content
 * @param {string} contentType - MIME type
 * @param {number} size - File size in bytes (optional for type-only validation)
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateFile = (contentType, size = null, options = {}) => {
  const {
    allowedTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      // Videos
      'video/mp4',
      'video/webm',
      'video/avi',
      'video/quicktime',
      'video/x-msvideo',
      // Audio
      'audio/webm',
      'audio/ogg',
      'audio/mpeg',
      'audio/mp4',
      'audio/wav',
      'audio/aac',
      // Documents
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSize = 100 * 1024 * 1024, // 100MB default
    minSize = 1024, // 1KB default
    skipSizeCheck = false,
  } = options;

  const errors = [];

  // Validate content type
  if (!allowedTypes.includes(contentType)) {
    errors.push(
      `File type '${contentType}' is not allowed. Allowed types: ${allowedTypes.join(
        ', '
      )}`
    );
  }

  // Validate file size if provided
  if (!skipSizeCheck && size !== null) {
    if (size > maxSize) {
      errors.push(
        `File size ${(size / 1024 / 1024).toFixed(
          2
        )}MB exceeds maximum allowed size ${(maxSize / 1024 / 1024).toFixed(
          2
        )}MB`
      );
    }

    if (size < minSize) {
      errors.push(
        `File size ${size} bytes is below minimum required size ${minSize} bytes`
      );
    }
  }

  // Additional validation for specific types
  if (contentType.startsWith('video/') && size && size > 500 * 1024 * 1024) {
    // 500MB for videos
    errors.push('Video files larger than 500MB should use resumable upload');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings:
      size && size > 50 * 1024 * 1024
        ? [
            'Large file detected. Consider using signed URL upload for better performance.',
          ]
        : [],
  };
};

/**
 * Generate a signed URL for reading/downloading files from GCS (private bucket)
 * @param {string} fileName - Filename in GCS
 * @param {number} expiresIn - Expiration time in minutes (default: 60)
 * @returns {Promise<string>} Signed download URL
 */
export const generateSignedDownloadUrl = async (fileName, expiresIn = 60) => {
  if (!isStorageConfigured()) {
    throw new Error(
      'Google Cloud Storage is not configured. Please set GOOGLE_CLOUD_BUCKET_NAME and ensure proper authentication.'
    );
  }

  try {
    const file = bucket.file(fileName);

    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresIn * 60 * 1000, // Convert minutes to milliseconds
    };

    const [url] = await file.getSignedUrl(options);
    return url;
  } catch (error) {
    console.error('Error generating signed download URL:', error);
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }
};

/**
 * Generate a signed URL for uploading files directly to GCS (client-side uploads)
 * @param {string} fileName - Original filename
 * @param {string} contentType - MIME type
 * @param {Object} options - Upload options
 * @param {number} options.expiresIn - Expiration time in minutes (default: 15)
 * @param {string} options.userId - User ID for file organization
 * @param {string} options.reportId - Report ID for file organization
 * @param {string} options.category - File category (images, videos, documents)
 * @param {Object} options.metadata - Additional metadata to store with file
 * @returns {Promise<{uploadUrl: string, fileName: string, downloadUrl: string}>}
 */
export const generateSignedUploadUrl = async (
  fileName,
  contentType,
  options = {}
) => {
  console.log('🔐 generateSignedUploadUrl called with:', {
    fileName,
    contentType,
    options: { ...options, metadata: 'present' },
  });

  if (!isStorageConfigured()) {
    const error =
      'Google Cloud Storage is not configured. Please set GOOGLE_CLOUD_BUCKET_NAME and ensure proper authentication.';
    console.error('❌ Storage configuration error:', error);
    throw new Error(error);
  }

  try {
    const {
      expiresIn = 15,
      userId,
      reportId,
      category = 'files',
      metadata = {},
      uploadTimestamp,
    } = options;

    console.log('🔍 Upload options:', {
      expiresIn,
      userId,
      reportId,
      category,
      metadataKeys: Object.keys(metadata),
      hasUploadTimestamp: !!uploadTimestamp,
    });

    // Validate file before generating upload URL
    const validation = validateFile(contentType);
    console.log('✅ File validation in storage:', {
      isValid: validation.isValid,
      errors: validation.errors,
    });

    if (!validation.isValid) {
      throw new Error(
        `File validation failed: ${validation.errors.join(', ')}`
      );
    }

    // Generate unique filename to prevent collisions
    const uniqueFileName = generateUniqueFilename(fileName, {
      userId,
      reportId,
      category,
    });

    console.log('📁 Generated unique filename:', {
      original: fileName,
      unique: uniqueFileName,
    });

    const file = bucket.file(uniqueFileName);
    console.log('📁 GCS file object created for:', uniqueFileName);

    // Configure upload options
    const timestamp = uploadTimestamp || new Date().toISOString();
    const extensionHeaders = {
      'x-goog-meta-original-name': fileName,
      'x-goog-meta-uploaded-at': timestamp,
      'x-goog-meta-uploader-id': String(userId || 'anonymous'),
      'x-goog-meta-report-id': reportId || '',
      'x-goog-meta-filesize': String(metadata.fileSize || ''),
      'x-goog-meta-category': String(metadata.category || ''),
      'x-goog-meta-userrole': String(metadata.userRole || 'citizen'),
    };

    const uploadOptions = {
      version: 'v4',
      action: 'write',
      expires: Date.now() + expiresIn * 60 * 1000, // Convert minutes to milliseconds
      contentType,
      extensionHeaders,
    };

    console.log('🔐 Extension headers for signing:', extensionHeaders);

    console.log('🔐 Upload options configured:', {
      version: uploadOptions.version,
      action: uploadOptions.action,
      expiresIn: `${expiresIn} minutes`,
      contentType: uploadOptions.contentType,
      headersCount: Object.keys(uploadOptions.extensionHeaders).length,
    });

    // Generate signed upload URL
    console.log('🔐 Generating signed URL for file:', uniqueFileName);
    const [uploadUrl] = await file.getSignedUrl(uploadOptions);
    console.log('✅ Signed upload URL generated successfully:', {
      urlLength: uploadUrl.length,
      urlPrefix: uploadUrl.substring(0, 50) + '...',
    });

    // Generate a signed download URL that will be valid after upload (valid for 1 hour)
    console.log('🔍 Generating signed download URL...');
    const downloadUrl = await generateSignedDownloadUrl(uniqueFileName, 60);
    console.log('✅ Signed download URL generated successfully');

    const result = {
      uploadUrl,
      fileName: uniqueFileName,
      downloadUrl,
      signedHeaders: {
        'Content-Type': contentType,
        ...extensionHeaders,
      },
      metadata: {
        originalName: fileName,
        contentType,
        category,
        userId,
        reportId,
        ...metadata,
      },
    };

    console.log('✅ generateSignedUploadUrl completed successfully:', {
      hasUploadUrl: !!result.uploadUrl,
      hasDownloadUrl: !!result.downloadUrl,
      fileName: result.fileName,
      signedHeadersCount: Object.keys(result.signedHeaders).length,
    });

    return result;
  } catch (error) {
    console.error('Error generating signed upload URL:', error);
    throw new Error(`Failed to generate upload URL: ${error.message}`);
  }
};

/**
 * Server-side upload for small files (< 10MB recommended)
 * For large videos, use resumable uploads or signed URLs instead
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original filename
 * @param {string} contentType - MIME type
 * @param {Object} options - Upload options
 * @returns {Promise<{fileName: string, downloadUrl: string}>}
 */
export const uploadFileServer = async (
  fileBuffer,
  fileName,
  contentType,
  options = {}
) => {
  if (!isStorageConfigured()) {
    throw new Error(
      'Google Cloud Storage is not configured. Please set GOOGLE_CLOUD_BUCKET_NAME and ensure proper authentication.'
    );
  }

  try {
    const { userId, reportId, category, metadata = {} } = options;

    // Warn about large files
    if (fileBuffer.length > 10 * 1024 * 1024) {
      // 10MB
      console.warn(
        `Large file upload (${(fileBuffer.length / 1024 / 1024).toFixed(
          2
        )}MB). Consider using resumable upload or signed URLs for better performance.`
      );
    }

    // Validate file
    const validation = validateFile(contentType, fileBuffer.length);
    if (!validation.isValid) {
      throw new Error(
        `File validation failed: ${validation.errors.join(', ')}`
      );
    }

    // Generate unique filename
    const uniqueFileName = generateUniqueFilename(fileName, {
      userId,
      reportId,
      category,
    });
    const file = bucket.file(uniqueFileName);

    // Prepare file metadata
    const fileMetadata = {
      contentType,
      metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
        uploaderId: userId,
        reportId: reportId,
        fileSize: fileBuffer.length.toString(),
        ...metadata,
      },
    };

    // Upload file to GCS (private bucket - no public access)
    await file.save(fileBuffer, {
      metadata: fileMetadata,
      resumable: fileBuffer.length > 5 * 1024 * 1024, // Use resumable for files > 5MB
    });

    // Generate signed download URL (valid for 1 hour)
    const downloadUrl = await generateSignedDownloadUrl(uniqueFileName, 60);

    return {
      fileName: uniqueFileName,
      downloadUrl,
      metadata: fileMetadata.metadata,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Delete a file from GCS
 * @param {string} fileName - Filename in GCS
 * @returns {Promise<boolean>} Success status
 */
export const deleteFile = async (fileName) => {
  if (!isStorageConfigured()) {
    throw new Error(
      'Google Cloud Storage is not configured. Please set GOOGLE_CLOUD_BUCKET_NAME and ensure proper authentication.'
    );
  }

  try {
    const file = bucket.file(fileName);
    await file.delete();
    console.log(`File ${fileName} deleted successfully`);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    // Don't throw error if file doesn't exist
    if (error.code === 404) {
      console.log(`File ${fileName} not found, considering as deleted`);
      return true;
    }
    return false;
  }
};

/**
 * Check if a file exists in GCS
 * @param {string} fileName - Filename in GCS
 * @returns {Promise<boolean>} File existence status
 */
export const fileExists = async (fileName) => {
  if (!isStorageConfigured()) {
    return false; // Return false instead of throwing error for existence check
  }

  try {
    const file = bucket.file(fileName);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
};

/**
 * Get file metadata from GCS
 * @param {string} fileName - Filename in GCS
 * @returns {Promise<Object>} File metadata
 */
export const getFileMetadata = async (fileName) => {
  if (!isStorageConfigured()) {
    throw new Error(
      'Google Cloud Storage is not configured. Please set GOOGLE_CLOUD_BUCKET_NAME and ensure proper authentication.'
    );
  }

  try {
    const file = bucket.file(fileName);
    const [metadata] = await file.getMetadata();

    return {
      name: metadata.name,
      contentType: metadata.contentType,
      size: parseInt(metadata.size),
      timeCreated: metadata.timeCreated,
      updated: metadata.updated,
      etag: metadata.etag,
      md5Hash: metadata.md5Hash,
      customMetadata: metadata.metadata || {},
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
};

/**
 * Generate multiple signed download URLs for a list of files
 * @param {string[]} fileNames - Array of filenames
 * @param {number} expiresIn - Expiration time in minutes
 * @returns {Promise<Object>} Object mapping filenames to signed URLs
 */
export const generateMultipleDownloadUrls = async (
  fileNames,
  expiresIn = 60
) => {
  try {
    const urlPromises = fileNames.map(async (fileName) => {
      try {
        const url = await generateSignedDownloadUrl(fileName, expiresIn);
        return { fileName, url, success: true };
      } catch (error) {
        console.error(`Failed to generate URL for ${fileName}:`, error);
        return { fileName, url: null, success: false, error: error.message };
      }
    });

    const results = await Promise.all(urlPromises);

    // Return object mapping filenames to URLs
    const urlMap = {};
    results.forEach(({ fileName, url, success, error }) => {
      urlMap[fileName] = success ? url : null;
      if (!success) {
        console.warn(
          `Failed to generate download URL for ${fileName}: ${error}`
        );
      }
    });

    return urlMap;
  } catch (error) {
    console.error('Error generating multiple download URLs:', error);
    throw new Error(`Failed to generate download URLs: ${error.message}`);
  }
};

/**
 * Clean up expired or orphaned files (utility function)
 * @param {string} prefix - File prefix to search for
 * @param {number} maxAge - Maximum age in days
 * @returns {Promise<number>} Number of files deleted
 */
export const cleanupOldFiles = async (prefix = '', maxAge = 30) => {
  if (!isStorageConfigured()) {
    throw new Error(
      'Google Cloud Storage is not configured. Please set GOOGLE_CLOUD_BUCKET_NAME and ensure proper authentication.'
    );
  }

  try {
    const [files] = await bucket.getFiles({ prefix });
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);

    let deletedCount = 0;

    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const createdDate = new Date(metadata.timeCreated);

      if (createdDate < cutoffDate) {
        try {
          await file.delete();
          deletedCount++;
          console.log(`Deleted old file: ${file.name}`);
        } catch (error) {
          console.error(`Failed to delete ${file.name}:`, error);
        }
      }
    }

    console.log(
      `Cleanup completed. Deleted ${deletedCount} files older than ${maxAge} days.`
    );
    return deletedCount;
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw new Error(`Cleanup failed: ${error.message}`);
  }
};

// Export default for convenience
export default {
  generateSignedUploadUrl,
  generateSignedDownloadUrl,
  uploadFileServer,
  deleteFile,
  fileExists,
  getFileMetadata,
  validateFile,
  generateMultipleDownloadUrls,
  cleanupOldFiles,
  isStorageConfigured,
};
