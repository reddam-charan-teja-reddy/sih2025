import { NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/emailService';

export async function POST(request) {
  try {
    const { email, token, fullName } = await request.json();

    if (!email || !token || !fullName) {
      return NextResponse.json(
        {
          error: 'Missing required fields: email, token, fullName',
        },
        { status: 400 }
      );
    }

    const result = await sendVerificationEmail(email, token, fullName);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
