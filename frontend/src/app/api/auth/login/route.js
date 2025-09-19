import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { authRateLimit } from '@/lib/rateLimit';
import { validateCredential, sanitizeInput } from '@/lib/validation';
import { generateTokens } from '@/lib/auth';

export async function POST(request) {
  try {
    // Rate limiting
    const rateLimitResult = authRateLimit.check(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: rateLimitResult.error,
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const credential = sanitizeInput(body.credential);
    const password = body.password;
    const rememberDevice = body.rememberDevice || false;

    if (!credential || !password) {
      return NextResponse.json(
        { error: 'Email/phone and password are required' },
        { status: 400 }
      );
    }

    // Validate credential format
    const credentialValidation = validateCredential(credential);
    if (!credentialValidation.isValid) {
      return NextResponse.json(
        { error: credentialValidation.error },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user by credentials and verify password
    const user = await User.findByCredentials(
      credentialValidation.value,
      password
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is verified
    if (!user.isVerified) {
      return NextResponse.json(
        {
          error: 'Please verify your account first',
          requiresVerification: true,
          userId: user._id,
        },
        { status: 403 }
      );
    }

    // Check if official account is verified (for officials)
    if (user.role === 'official' && !user.isOfficialVerified) {
      return NextResponse.json(
        {
          error:
            'Your official account is pending verification. Please contact your administrator.',
          requiresOfficialVerification: true,
        },
        { status: 403 }
      );
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token to user document
    user.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date(),
    });

    // Limit refresh tokens (keep only last 5)
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Prepare response
    const responseData = {
      message: 'Login successful',
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
        lastLogin: user.lastLogin,
      },
      accessToken,
    };

    // Set refresh token as httpOnly cookie
    const response = NextResponse.json(responseData, { status: 200 });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberDevice ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 7 days or 1 day
      path: '/',
    };

    response.cookies.set('refreshToken', refreshToken, cookieOptions);

    return response;
  } catch (error) {
    console.error('Login error:', error);

    if (error.message.includes('locked')) {
      return NextResponse.json(
        { error: error.message },
        { status: 423 } // Locked
      );
    }

    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
