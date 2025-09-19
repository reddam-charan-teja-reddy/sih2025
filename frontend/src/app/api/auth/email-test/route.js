import { NextResponse } from 'next/server';
import { verifyEmailConfig } from '@/lib/emailService';

export async function GET() {
  try {
    const isConfigValid = await verifyEmailConfig();

    return NextResponse.json({
      emailConfigured: isConfigValid,
      service: process.env.EMAIL_SERVICE || 'not configured',
      user: process.env.EMAIL_USER || 'not configured',
      hasPassword: !!process.env.EMAIL_PASS,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to verify email configuration',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
