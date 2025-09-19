import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { forgotPasswordRateLimit } from '@/lib/rateLimit';
import { validateCredential, sanitizeInput } from '@/lib/validation';
import { sendPasswordResetEmail } from '@/lib/emailService';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const body = await request.json();

    // Rate limiting by credential
    const rateLimitResult = forgotPasswordRateLimit.check({
      ...request,
      body: { credential: body.credential },
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: rateLimitResult.error,
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );
    }

    const credential = sanitizeInput(body.credential);

    if (!credential) {
      return NextResponse.json(
        { error: 'Email or phone number is required' },
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

    // Find user by credential
    const query =
      credentialValidation.type === 'email'
        ? { email: credentialValidation.value }
        : { phone: credentialValidation.value };

    const user = await User.findOne(query);

    // Always return success message to prevent user enumeration
    const successMessage =
      credentialValidation.type === 'email'
        ? 'If an account with this email exists, you will receive a password reset link.'
        : 'If an account with this phone number exists, you will receive a password reset code.';

    if (!user) {
      return NextResponse.json({ message: successMessage }, { status: 200 });
    }

    // Generate password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send reset token via email or SMS
    if (credentialValidation.type === 'email') {
      try {
        const emailResult = await sendPasswordResetEmail(
          user.email,
          resetToken,
          user.fullName
        );

        if (emailResult.success) {
          console.log(
            'Password reset email sent successfully:',
            emailResult.messageId
          );
        } else {
          console.error(
            'Failed to send password reset email:',
            emailResult.error
          );
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
    } else {
      // TODO: Implement SMS sending for phone-based reset
      console.log(`Password reset token for ${user.phone}: ${resetToken}`);
    }

    return NextResponse.json({ message: successMessage }, { status: 200 });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
