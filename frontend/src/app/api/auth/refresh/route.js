import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { generateTokens } from '@/lib/auth';

export async function POST(request) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value;
    console.log('Refresh token request - Token exists:', !!refreshToken);

    if (!refreshToken) {
      console.log('Refresh failed: No refresh token found in cookies');
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      );
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      console.log('Token verification successful for user:', decoded.id);
    } catch (error) {
      console.log('Refresh failed: Invalid refresh token -', error.message);
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user and check if refresh token exists
    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('Refresh failed: User not found for ID:', decoded.id);
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    console.log(
      'User found:',
      user.email,
      'Refresh tokens count:',
      user.refreshTokens?.length || 0
    );

    // Clean up old refresh tokens (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const validTokens = user.refreshTokens.filter(
      (tokenObj) => tokenObj.createdAt > sevenDaysAgo
    );

    // Check if refresh token exists in user's tokens
    const tokenExists = validTokens.some(
      (tokenObj) => tokenObj.token === refreshToken
    );

    if (!tokenExists) {
      console.log('Refresh failed: Token not found in user tokens array');
      // Check if this might be due to a recent successful refresh
      const now = new Date();
      const recentTokens = validTokens.filter(
        (tokenObj) => now - tokenObj.createdAt < 10000 // Within last 10 seconds
      );

      if (recentTokens.length > 0) {
        console.log('Recent token found - possible concurrent refresh');
        // For concurrent requests, try to return the most recent token's user data
        const mostRecentToken = recentTokens.sort(
          (a, b) => b.createdAt - a.createdAt
        )[0];

        // Generate a new access token for this request
        const { accessToken } = generateTokens(user);

        const responseData = {
          message: 'Token refreshed successfully (concurrent request)',
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified,
            isOfficialVerified: user.isOfficialVerified,
            language: user.language,
            organization: user.organization,
          },
          accessToken,
        };

        return NextResponse.json(responseData, { status: 200 });
      }

      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Check if user is still verified
    if (!user.isVerified) {
      console.log('Refresh failed: User account not verified');
      return NextResponse.json(
        { error: 'Account verification required' },
        { status: 403 }
      );
    }

    console.log('Generating new tokens for user:', user.email);

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Use a more robust atomic update to handle concurrent requests
    let finalResult;
    try {
      // First, try to remove the old token and clean up expired tokens
      const updateResult = await User.findOneAndUpdate(
        {
          _id: user._id,
          'refreshTokens.token': refreshToken, // Ensure the token still exists
        },
        {
          $pull: {
            refreshTokens: {
              $or: [
                { token: refreshToken }, // Remove the current token
                { createdAt: { $lt: sevenDaysAgo } }, // Remove expired tokens
              ],
            },
          },
        },
        { new: false } // Return the document before update
      );

      if (!updateResult) {
        console.log(
          'Token no longer exists or user not found - possible concurrent refresh'
        );
        return NextResponse.json(
          { error: 'Token refresh failed, please try again' },
          { status: 409 }
        );
      }

      // Now add the new token
      finalResult = await User.findByIdAndUpdate(
        user._id,
        {
          $push: {
            refreshTokens: {
              token: newRefreshToken,
              createdAt: new Date(),
            },
          },
        },
        { new: true, runValidators: true }
      );

      if (!finalResult) {
        console.log('Failed to add new refresh token');
        return NextResponse.json(
          { error: 'Token refresh failed, please try again' },
          { status: 500 }
        );
      }

      console.log('✅ Token refresh successful for user:', user.email);
    } catch (updateError) {
      console.error('Error updating refresh tokens:', updateError);

      // Handle specific MongoDB errors
      if (updateError.code === 40) {
        // ConflictingUpdateOperators
        return NextResponse.json(
          { error: 'Concurrent token refresh detected, please try again' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Token refresh failed due to database error' },
        { status: 500 }
      );
    }

    // Prepare response
    const responseData = {
      message: 'Token refreshed successfully',
      user: {
        id: finalResult._id,
        fullName: finalResult.fullName,
        email: finalResult.email,
        phone: finalResult.phone,
        role: finalResult.role,
        isVerified: finalResult.isVerified,
        isOfficialVerified: finalResult.isOfficialVerified,
        language: finalResult.language,
        organization: finalResult.organization,
      },
      accessToken,
    };

    // Set new refresh token as httpOnly cookie
    const response = NextResponse.json(responseData, { status: 200 });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (match user's original preference)
      path: '/',
    };

    response.cookies.set('refreshToken', newRefreshToken, cookieOptions);

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
