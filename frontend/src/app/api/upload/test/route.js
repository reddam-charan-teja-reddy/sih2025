import { NextResponse } from 'next/server';
import { validateFile } from '@/lib/storage';
import { verifyToken } from '@/lib/auth';

export async function POST(request) {
  try {
    // Verify authentication (only for testing - could be admin only)
    const authResult = await verifyToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Only allow officials/admins to run storage tests
    if (user.role !== 'official' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only officials can run storage tests' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { testType = 'validation' } = body;

    switch (testType) {
      case 'validation':
        // Test file validation
        const testFiles = [
          { contentType: 'image/jpeg', size: 1024 * 1024 }, // 1MB image - should pass
          { contentType: 'video/mp4', size: 50 * 1024 * 1024 }, // 50MB video - should pass
          { contentType: 'application/exe', size: 1024 }, // .exe file - should fail
          { contentType: 'image/jpeg', size: 200 * 1024 * 1024 }, // 200MB image - should fail
        ];

        const validationResults = testFiles.map((file) => ({
          contentType: file.contentType,
          size: file.size,
          result: validateFile(file.contentType, file.size),
        }));

        return NextResponse.json({
          testType: 'validation',
          results: validationResults,
          summary: {
            passed: validationResults.filter((r) => r.result.isValid).length,
            failed: validationResults.filter((r) => !r.result.isValid).length,
            total: validationResults.length,
          },
        });

      case 'config':
        // Test configuration
        const config = {
          bucketName: process.env.GOOGLE_CLOUD_BUCKET_NAME || 'Not configured',
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'Not configured',
          keyFile: process.env.GOOGLE_CLOUD_KEYFILE
            ? 'Configured'
            : 'Using default credentials',
          envCheck: {
            NODE_ENV: process.env.NODE_ENV,
            hasGoogleCreds: !!(
              process.env.GOOGLE_CLOUD_KEYFILE ||
              process.env.GOOGLE_APPLICATION_CREDENTIALS
            ),
          },
        };

        return NextResponse.json({
          testType: 'config',
          config,
          isProduction: process.env.NODE_ENV === 'production',
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: 'Unknown test type. Available: validation, config' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Storage test error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    );
  }
}
