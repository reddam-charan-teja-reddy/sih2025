// pages/api/upload/verify.js
import { fileExists, getFileMetadata } from '@/lib/storage';

export async function POST(request) {
  try {
    const { fileName } = await request.json();

    if (!fileName) {
      return Response.json({ error: 'fileName is required' }, { status: 400 });
    }

    const exists = await fileExists(fileName);
    const metadata = exists ? await getFileMetadata(fileName) : null;

    return Response.json({
      exists,
      metadata,
      fileName,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return Response.json({ error: 'Verification failed' }, { status: 500 });
  }
}
