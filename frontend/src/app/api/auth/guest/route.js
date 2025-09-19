import { NextResponse } from 'next/server';
import { generateGuestToken } from '@/lib/auth';

export async function POST(request) {
  try {
    // Generate guest token valid for 10 minutes
    const guestToken = generateGuestToken();

    const responseData = {
      message: 'Guest session created successfully',
      accessToken: guestToken,
      expiresIn: 600, // 10 minutes
      userType: 'guest',
      limitations: [
        'Cannot submit reports',
        'Cannot save preferences',
        'Limited to read-only access',
        'Session expires in 10 minutes',
      ],
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('Guest login error:', error);
    return NextResponse.json(
      { error: 'Failed to create guest session' },
      { status: 500 }
    );
  }
}
