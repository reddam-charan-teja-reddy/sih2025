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
        'Same access as citizen for core features',
        'Session expires in 10 minutes',
      ],
    };

    // Create response and set a secure, httpOnly cookie so middleware can recognize guest sessions
    const response = NextResponse.json(responseData, { status: 200 });
    response.cookies.set('guestToken', guestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Guest login error:', error);
    return NextResponse.json(
      { error: 'Failed to create guest session' },
      { status: 500 }
    );
  }
}
