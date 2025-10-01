import { NextResponse } from 'next/server';
import { sendPasswordResetEmail, verifyEmailConfig } from '@/lib/emailService';

export async function POST(request) {
  try {
    const { email, testToken, fullName } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required for testing' },
        { status: 400 }
      );
    }

    // First verify email configuration
    console.log('🔍 Testing email configuration...');
    const isConfigValid = await verifyEmailConfig();

    if (!isConfigValid) {
      return NextResponse.json(
        {
          error: 'Email configuration is invalid',
          config: {
            emailService: process.env.EMAIL_SERVICE || 'not set',
            emailUser: process.env.EMAIL_USER || 'not set',
            hasEmailPass: !!process.env.EMAIL_PASS,
            emailHost: process.env.EMAIL_HOST || 'not set',
            emailPort: process.env.EMAIL_PORT || 'not set',
          },
        },
        { status: 500 }
      );
    }

    // Test sending password reset email
    console.log('📧 Testing password reset email sending...');
    const result = await sendPasswordResetEmail(
      email,
      testToken || 'TEST123456',
      fullName || 'Test User'
    );

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      config: {
        emailService: process.env.EMAIL_SERVICE || 'not set',
        emailUser: process.env.EMAIL_USER
          ? process.env.EMAIL_USER.substring(0, 5) + '***'
          : 'not set',
        hasEmailPass: !!process.env.EMAIL_PASS,
      },
    });
  } catch (error) {
    console.error('❌ Test password reset error:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
