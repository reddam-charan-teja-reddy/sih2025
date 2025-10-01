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
    console.log('🔍 Credential validation result:', {
      input: credential,
      validation: credentialValidation,
    });

    if (!credentialValidation.isValid) {
      console.log(
        '❌ Credential validation failed:',
        credentialValidation.error
      );
      return NextResponse.json(
        { error: credentialValidation.error },
        { status: 400 }
      );
    }

    await connectDB();

    console.log('🔑 Attempting to find user with:', {
      type: credentialValidation.type,
      value: credentialValidation.value,
      originalInput: credential,
    });

    // Find user by credentials and verify password
    const user = await User.findByCredentials(
      credentialValidation.value,
      password
    );

    if (!user) {
      console.log('❌ User not found or password mismatch for:', {
        credential: credentialValidation.value,
        type: credentialValidation.type,
      });

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

    // Use atomic update to prevent version conflicts
    const updateResult = await User.findByIdAndUpdate(
      user._id,
      {
        $push: {
          refreshTokens: {
            $each: [
              {
                token: refreshToken,
                createdAt: new Date(),
              },
            ],
            $slice: -5, // Keep only last 5 tokens
          },
        },
        $set: { lastLogin: new Date() },
      },
      { new: true, runValidators: true }
    );

    if (!updateResult) {
      console.log('Failed to update user login data');
      return NextResponse.json(
        { message: 'Login failed, please try again' },
        { status: 500 }
      );
    }

    // Prepare response
    const responseData = {
      message: 'Login successful',
      user: {
        id: updateResult._id,
        fullName: updateResult.fullName,
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
      maxAge: rememberDevice
        ? 30 * 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000, // 30 days or 7 days
      path: '/',
    };

    response.cookies.set('refreshToken', refreshToken, cookieOptions);

    // Clear any stale guest session cookie on full login
    response.cookies.set('guestToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('❌ Login error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    if (error.message.includes('locked')) {
      console.log('🔒 Account locked error');
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
