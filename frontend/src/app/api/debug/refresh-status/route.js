import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(request) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value;

    const debugInfo = {
      hasRefreshTokenCookie: !!refreshToken,
      cookieValue: refreshToken ? 'Present (hidden for security)' : 'Missing',
    };

    if (!refreshToken) {
      return NextResponse.json({
        status: 'No refresh token found',
        debug: debugInfo,
      });
    }

    // Try to decode the token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      debugInfo.tokenValid = true;
      debugInfo.userId = decoded.id;
      debugInfo.tokenExp = new Date(decoded.exp * 1000);
      debugInfo.isExpired = Date.now() > decoded.exp * 1000;
    } catch (error) {
      debugInfo.tokenValid = false;
      debugInfo.tokenError = error.message;
      return NextResponse.json({
        status: 'Invalid refresh token',
        debug: debugInfo,
      });
    }

    // Check if user exists and has this token
    await connectDB();
    const user = await User.findById(decoded.id);

    if (!user) {
      debugInfo.userExists = false;
      return NextResponse.json({
        status: 'User not found',
        debug: debugInfo,
      });
    }

    debugInfo.userExists = true;
    debugInfo.userEmail = user.email;
    debugInfo.isVerified = user.isVerified;
    debugInfo.refreshTokensCount = user.refreshTokens?.length || 0;

    const tokenExists = user.refreshTokens.some(
      (tokenObj) => tokenObj.token === refreshToken
    );

    debugInfo.tokenInDatabase = tokenExists;

    return NextResponse.json({
      status: tokenExists
        ? 'Token valid and found in database'
        : 'Token not found in user records',
      debug: debugInfo,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'Error checking refresh token',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
