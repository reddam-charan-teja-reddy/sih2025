import { NextResponse } from 'next/server';
import {
  generateSignedDownloadUrl,
  generateMultipleDownloadUrls,
} from '@/lib/storage';
import { verifyToken } from '@/lib/auth';

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fileName, fileNames, expiresIn = 60 } = body;

    if (!fileName && !fileNames) {
      return NextResponse.json(
        { error: 'Either fileName or fileNames array is required' },
        { status: 400 }
      );
    }

    // Handle single file
    if (fileName) {
      try {
        const downloadUrl = await generateSignedDownloadUrl(
          fileName,
          expiresIn
        );
        return NextResponse.json({
          fileName,
          downloadUrl,
          expiresIn: expiresIn * 60, // Return in seconds
          expiresAt: new Date(Date.now() + expiresIn * 60 * 1000).toISOString(),
        });
      } catch (error) {
        console.error('Error generating download URL:', error);
        return NextResponse.json(
          { error: 'Failed to generate download URL', details: error.message },
          { status: 500 }
        );
      }
    }

    // Handle multiple files
    if (fileNames && Array.isArray(fileNames)) {
      if (fileNames.length > 50) {
        return NextResponse.json(
          { error: 'Maximum 50 files can be processed at once' },
          { status: 400 }
        );
      }

      try {
        const urlMap = await generateMultipleDownloadUrls(fileNames, expiresIn);

        const results = fileNames.map((fileName) => ({
          fileName,
          downloadUrl: urlMap[fileName],
          success: urlMap[fileName] !== null,
        }));

        return NextResponse.json({
          results,
          expiresIn: expiresIn * 60, // Return in seconds
          expiresAt: new Date(Date.now() + expiresIn * 60 * 1000).toISOString(),
          successCount: results.filter((r) => r.success).length,
          totalCount: results.length,
        });
      } catch (error) {
        console.error('Error generating multiple download URLs:', error);
        return NextResponse.json(
          { error: 'Failed to generate download URLs', details: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in refresh-urls endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
