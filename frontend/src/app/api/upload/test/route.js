import { NextResponse } from 'next/server';
import { validateFile } from '@/lib/storage';
import { verifyToken } from '@/lib/auth';
import { Storage } from '@google-cloud/storage';

// Add a GET method for simple GCS testing without authentication
export async function GET() {
  try {
    console.log('🔍 Testing GCS configuration...');

    // Check environment variables
    const envCheck = {
      GOOGLE_CLOUD_PROJECT_ID: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
      GOOGLE_CLOUD_BUCKET_NAME: !!process.env.GOOGLE_CLOUD_BUCKET_NAME,
      GOOGLE_CLOUD_KEYFILE: !!process.env.GOOGLE_CLOUD_KEYFILE,
      GOOGLE_APPLICATION_CREDENTIALS:
        !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      NODE_ENV: process.env.NODE_ENV,
    };

    console.log('📋 Environment variables check:', envCheck);

    if (!process.env.GOOGLE_CLOUD_BUCKET_NAME) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_CLOUD_BUCKET_NAME is not set',
        envCheck,
      });
    }

    // Try to initialize Storage
    const storageOptions = {};
    const keyEnv =
      process.env.GOOGLE_CLOUD_KEYFILE ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (keyEnv) {
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
          return NextResponse.json({
            success: false,
            error: 'Invalid JSON in GOOGLE_CLOUD_KEYFILE',
            envCheck,
          });
        }
      } else {
        storageOptions.keyFilename = keyEnv;
        if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
          storageOptions.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        }
      }
    } else if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
      storageOptions.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    }

    console.log('⚙️ Storage options:', {
      hasProjectId: !!storageOptions.projectId,
      hasCredentials: !!storageOptions.credentials,
      hasKeyFilename: !!storageOptions.keyFilename,
      projectId: storageOptions.projectId,
    });

    const storage = new Storage(storageOptions);
    const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME);

    // Test bucket access
    console.log('🧪 Testing bucket access...');
    const [exists] = await bucket.exists();
    console.log('📦 Bucket exists:', exists);

    if (!exists) {
      return NextResponse.json({
        success: false,
        error: 'Bucket does not exist or no access',
        bucketName: process.env.GOOGLE_CLOUD_BUCKET_NAME,
        envCheck,
      });
    }

    // Test listing files (just to verify permissions)
    console.log('📁 Testing file listing...');
    const [files] = await bucket.getFiles({ maxResults: 5 });
    console.log('📄 Found files:', files.length);

    // Test creating a signed URL for a test file
    console.log('🔗 Testing signed URL generation...');
    const testFile = bucket.file('test/test-file.txt');
    const [uploadUrl] = await testFile.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: 'text/plain',
    });

    return NextResponse.json({
      success: true,
      message: 'GCS configuration is working',
      bucketName: process.env.GOOGLE_CLOUD_BUCKET_NAME,
      projectId: storageOptions.projectId,
      filesCount: files.length,
      hasSignedUrl: !!uploadUrl,
      envCheck,
    });
  } catch (error) {
    console.error('❌ GCS test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

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
