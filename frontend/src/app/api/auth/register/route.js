import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { registerRateLimit } from '@/lib/rateLimit';
import { validateRegistrationData, sanitizeUserData } from '@/lib/validation';
import { sendVerificationEmail, verifyEmailConfig } from '@/lib/emailService';

export async function POST(request) {
  try {
    // Rate limiting
    const rateLimitResult = registerRateLimit.check(request);
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
    console.log('Registration request body:', {
      ...body,
      password: '[HIDDEN]',
    });

    const sanitizedData = sanitizeUserData(body);
    console.log('Sanitized data:', { ...sanitizedData, password: '[HIDDEN]' });

    // Validate input data
    const validation = validateRegistrationData(sanitizedData);
    if (!validation.isValid) {
      console.log('Validation failed:', validation.errors);
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    await connectDB();
    console.log('Connected to database successfully');

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: sanitizedData.email.toLowerCase() },
        { phone: sanitizedData.phone },
      ],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email or phone number already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const userData = {
      fullName: sanitizedData.fullName,
      email: sanitizedData.email.toLowerCase(),
      phone: sanitizedData.phone,
      password: sanitizedData.password,
      role: sanitizedData.role,
      language: sanitizedData.language || 'en',
    };

    // Add official-specific fields
    if (sanitizedData.role === 'official') {
      userData.officialId = sanitizedData.officialId;
      userData.organization = sanitizedData.organization;
    }

    const user = new User(userData);

    // Generate verification token
    const verificationToken = user.generateVerificationToken();

    await user.save();
    console.log('User saved successfully, sending verification email...');

    // Send verification email
    try {
      const emailResult = await sendVerificationEmail(
        user.email,
        verificationToken,
        user.fullName
      );

      if (emailResult.success) {
        console.log(
          'Verification email sent successfully:',
          emailResult.messageId
        );
      } else {
        console.error('Failed to send verification email:', emailResult.error);
        // Continue with registration even if email fails
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue with registration even if email fails
    }

    // Return success response (don't include sensitive data)
    const responseData = {
      message:
        'Registration successful. Please check your email/phone for verification.',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        isOfficialVerified: user.isOfficialVerified,
      },
      verificationRequired: true,
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return NextResponse.json(
        {
          error: `${
            field === 'email' ? 'Email' : 'Phone number'
          } is already registered`,
        },
        { status: 409 }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
