import { NextResponse } from 'next/server';
import { generateSignedUploadUrl, validateFile } from '@/lib/storage';
import { authMiddleware, guestMiddleware } from '@/lib/auth';

export async function POST(request) {
  try {
    console.log('📋 Starting signed URL generation request');

    // Verify authentication or guest session
    const guestAuth = await guestMiddleware(request);
    console.log('🔐 Authentication result:', {
      hasError: !!guestAuth.error,
      isGuest: !!guestAuth.isGuest,
      success: !!guestAuth.success,
      userRole: guestAuth.user?.role,
    });

    if (guestAuth.error) {
      console.log('❌ Authentication failed:', guestAuth.error);
      return NextResponse.json(
        { error: guestAuth.error },
        { status: guestAuth.status }
      );
    }
    const user = guestAuth.success
      ? guestAuth.user
      : { _id: null, role: 'citizen', isGuest: true };

    const body = await request.json();
    console.log('📋 Request body:', {
      fileName: body.fileName,
      contentType: body.contentType,
      fileSize: body.fileSize,
      fileCategory: body.fileCategory,
    });

    const { fileName, contentType, fileSize, fileCategory = 'general' } = body;

    if (!fileName || !contentType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, contentType, fileSize' },
        { status: 400 }
      );
    }

    // Determine effective category based on content type for validation and limits
    const effectiveCategory = contentType.startsWith('video/')
      ? 'video'
      : contentType.startsWith('audio/')
      ? 'audio'
      : contentType.startsWith('image/')
      ? 'image'
      : 'document';

    console.log('📋 File categorization:', {
      contentType,
      effectiveCategory,
      requestedCategory: fileCategory,
    });

    // Validate file
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
      maxSize:
        effectiveCategory === 'video'
          ? 100 * 1024 * 1024
          : effectiveCategory === 'audio'
          ? 20 * 1024 * 1024
          : effectiveCategory === 'image'
          ? 50 * 1024 * 1024
          : 50 * 1024 * 1024, // 100MB for video, 20MB for audio, 50MB for others
      minSize: 1024, // 1KB
    };

    const validation = validateFile(contentType, fileSize, validationOptions);
    console.log('✅ File validation result:', {
      isValid: validation.isValid,
      errors: validation.errors,
    });

    if (!validation.isValid) {
      console.log('❌ File validation failed:', validation.errors);
      return NextResponse.json(
        { error: 'File validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Determine category based on content type
    let category = 'files';
    if (contentType.startsWith('image/')) {
      category = 'images';
    } else if (contentType.startsWith('video/')) {
      category = 'videos';
    } else if (contentType.startsWith('audio/')) {
      category = 'audio';
    } else {
      category = 'documents';
    }

    console.log('📦 Storage category determined:', category);
    console.log('📁 User info for upload:', {
      userId: user?._id || user?.id || 'guest',
      userRole: user.role || 'citizen',
      isGuest: user.isGuest,
    });

    // Generate signed upload URL with new secure implementation
    console.log('🔐 Generating signed upload URL...');
    const uploadTimestamp = new Date().toISOString();
    const uploadData = await generateSignedUploadUrl(fileName, contentType, {
      expiresIn: 15, // 15 minutes expiry
      userId: user?._id || user?.id || 'guest',
      category,
      metadata: {
        fileSize: fileSize.toString(),
        category: fileCategory,
        userRole: user.role || 'citizen',
      },
      uploadTimestamp, // Pass the timestamp to ensure consistency
    });

    console.log('✅ Signed URL generated successfully:', {
      hasUploadUrl: !!uploadData.uploadUrl,
      hasDownloadUrl: !!uploadData.downloadUrl,
      fileName: uploadData.fileName,
      uploadUrlLength: uploadData.uploadUrl?.length,
    });

    // Return upload URL and metadata (using downloadUrl from private bucket with signed access)
    return NextResponse.json({
      uploadUrl: uploadData.uploadUrl,
      downloadUrl: uploadData.downloadUrl, // Signed download URL instead of public URL
      fileName: uploadData.fileName,
      expiresIn: 15 * 60, // 15 minutes in seconds
      requiredHeaders: uploadData.signedHeaders || {
        'Content-Type': contentType,
        'x-goog-meta-original-name': fileName,
        'x-goog-meta-uploaded-at': uploadTimestamp,
        'x-goog-meta-uploader-id': String(user?._id || user?.id || 'guest'),
        'x-goog-meta-report-id': '',
        'x-goog-meta-filesize': fileSize.toString(),
        'x-goog-meta-category': fileCategory,
        'x-goog-meta-userrole': user.role || 'citizen',
      },
      metadata: {
        originalName: fileName,
        contentType,
        fileSize,
        category: fileCategory,
        uploadedBy: user.id,
        uploadedAt: uploadTimestamp,
      },
    });
  } catch (error) {
    console.error('❌ Error generating upload URL:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
