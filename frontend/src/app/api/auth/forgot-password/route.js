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
    console.log('🔄 Forgot password request received:', {
      credential: body.credential
        ? body.credential.substring(0, 5) + '***'
        : 'none',
      hasCredential: !!body.credential,
    });

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
    console.log('🔍 Credential validation:', {
      isValid: credentialValidation.isValid,
      type: credentialValidation.type,
      error: credentialValidation.error,
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

    // Find user by credential
    let query;
    if (credentialValidation.type === 'email') {
      query = { email: credentialValidation.value };
    } else {
      // For phone numbers, try multiple formats to handle normalization inconsistencies
      const cleanPhone = credentialValidation.value.replace(/[\s\-\(\)]/g, '');
      const phoneWithPlus = cleanPhone.startsWith('+')
        ? cleanPhone
        : `+${cleanPhone}`;
      const phoneWithoutPlus = cleanPhone.startsWith('+')
        ? cleanPhone.substring(1)
        : cleanPhone;

      query = {
        $or: [
          { phone: credentialValidation.value }, // Original format
          { phone: cleanPhone }, // Cleaned format
          { phone: phoneWithPlus }, // With + prefix
          { phone: phoneWithoutPlus }, // Without + prefix
        ],
      };
    }

    console.log('🔍 Searching for user with query:', query);
    const user = await User.findOne(query);
    console.log('🔍 User found:', {
      found: !!user,
      userId: user?._id,
      email: user?.email,
      phone: user?.phone,
    });

    // Always return success message to prevent user enumeration
    const successMessage =
      credentialValidation.type === 'email'
        ? 'If an account with this email exists, you will receive a password reset link.'
        : 'If an account with this phone number exists, you will receive a password reset code.';

    if (!user) {
      console.log(
        '❌ No user found for credential, returning success message for security'
      );
      return NextResponse.json({ message: successMessage }, { status: 200 });
    }

    // Generate password reset token
    console.log('🔑 Generating password reset token for user:', user._id);
    const resetToken = user.generatePasswordResetToken();
    await user.save();
    console.log('✅ Password reset token generated and saved');

    // Send reset token via email or SMS
    if (credentialValidation.type === 'email') {
      console.log('📧 Attempting to send password reset email to:', user.email);
      try {
        // Check environment variables
        console.log('📧 Email configuration check:', {
          hasEmailUser: !!process.env.EMAIL_USER,
          hasEmailPass: !!process.env.EMAIL_PASS,
          emailService: process.env.EMAIL_SERVICE,
          frontendUrl: process.env.FRONTEND_URL,
        });

        const emailResult = await sendPasswordResetEmail(
          user.email,
          resetToken,
          user.fullName
        );

        console.log('📧 Email sending result:', emailResult);

        if (emailResult.success) {
          console.log(
            '✅ Password reset email sent successfully:',
            emailResult.messageId
          );
        } else {
          console.error(
            '❌ Failed to send password reset email:',
            emailResult.error
          );
        }
      } catch (emailError) {
        console.error('❌ Email sending error:', {
          message: emailError.message,
          stack: emailError.stack,
          code: emailError.code,
        });
      }
    } else {
      // TODO: Implement SMS sending for phone-based reset
      console.log(`📱 Password reset token for ${user.phone}: ${resetToken}`);
    }

    return NextResponse.json({ message: successMessage }, { status: 200 });
  } catch (error) {
    console.error('❌ Forgot password error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
