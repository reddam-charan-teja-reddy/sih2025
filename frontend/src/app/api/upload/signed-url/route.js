import { NextResponse } from 'next/server';
import { generateSignedUploadUrl, validateFile } from '@/lib/storage';
import { authMiddleware } from '@/lib/auth';

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;

    // Check if user can upload files (no guest mode)
    if (user.isGuest) {
      return NextResponse.json(
        { error: 'Guest users cannot upload files. Please sign in.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fileName, contentType, fileSize, fileCategory = 'general' } = body;

    if (!fileName || !contentType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, contentType, fileSize' },
        { status: 400 }
      );
    }

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
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      maxSize: fileCategory === 'video' ? 100 * 1024 * 1024 : 50 * 1024 * 1024, // 100MB for video, 50MB for others
      minSize: 1024, // 1KB
    };

    const validation = validateFile(contentType, fileSize, validationOptions);
    if (!validation.isValid) {
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
    } else {
      category = 'documents';
    }

    // Generate signed upload URL with new secure implementation
    const uploadData = await generateSignedUploadUrl(fileName, contentType, {
      expiresIn: 15, // 15 minutes expiry
      userId: user.id,
      category,
      metadata: {
        fileSize: fileSize.toString(),
        category: fileCategory,
        userRole: user.role,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Return upload URL and metadata (using downloadUrl from private bucket with signed access)
    return NextResponse.json({
      uploadUrl: uploadData.uploadUrl,
      downloadUrl: uploadData.downloadUrl, // Signed download URL instead of public URL
      fileName: uploadData.fileName,
      expiresIn: 15 * 60, // 15 minutes in seconds
      metadata: {
        originalName: fileName,
        contentType,
        fileSize,
        category: fileCategory,
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
