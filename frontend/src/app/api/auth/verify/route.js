import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { authRateLimit } from '@/lib/rateLimit';
import { sanitizeInput } from '@/lib/validation';
import { sendWelcomeEmail } from '@/lib/emailService';
import crypto from 'crypto';

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
    const code = sanitizeInput(body.code || body.token); // Support both 'code' and 'token' for backward compatibility

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Validate that it's a 6-digit code
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        {
          error:
            'Invalid verification code format. Please enter a 6-digit code.',
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Hash the code to match stored hash
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    // Find user with valid verification token
    const user = await User.findOne({
      verificationToken: hashedCode,
      verificationTokenExpires: { $gt: Date.now() },
    }).select('+verificationToken +verificationTokenExpires');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Update user verification status
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

    await user.save();

    // Send welcome email after successful verification
    try {
      const emailResult = await sendWelcomeEmail(
        user.email,
        user.fullName,
        user.role
      );

      if (emailResult.success) {
        console.log('Welcome email sent successfully:', emailResult.messageId);
      } else {
        console.error('Failed to send welcome email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
      // Continue even if email fails
    }

    return NextResponse.json(
      {
        message: 'Account verified successfully. You can now log in.',
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify account error:', error);
    return NextResponse.json(
      { error: 'Failed to verify account' },
      { status: 500 }
    );
  }
}

// Resend verification token
export async function PUT(request) {
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
    const userId = sanitizeInput(body.userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: 'Account is already verified' },
        { status: 400 }
      );
    }

    // Generate new verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // TODO: Send verification email/SMS
    // await sendVerificationEmail(user.email, verificationToken);
    console.log(
      `New verification token for ${user.email}: ${verificationToken}`
    );

    return NextResponse.json(
      { message: 'Verification token sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification token' },
      { status: 500 }
    );
  }
}
