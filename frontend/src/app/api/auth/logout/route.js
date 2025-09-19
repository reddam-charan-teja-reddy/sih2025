import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (refreshToken) {
      await connectDB();

      // Remove refresh token from user's tokens array
      const body = await request.json().catch(() => ({}));
      const userId = body.userId;

      if (userId) {
        await User.findByIdAndUpdate(userId, {
          $pull: { refreshTokens: { token: refreshToken } },
        });
      }
    }

    // Clear refresh token cookie
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
