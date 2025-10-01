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

    // Build query conditions for existing user check
    const queryConditions = [{ email: sanitizedData.email.toLowerCase() }];

    // Only check phone if it's provided
    if (sanitizedData.phone && sanitizedData.phone.trim()) {
      const normalizedPhone = sanitizedData.phone.replace(/[\s\-\(\)]/g, '');
      const phoneWithPlus = normalizedPhone.startsWith('+')
        ? normalizedPhone
        : `+${normalizedPhone}`;
      const phoneWithoutPlus = normalizedPhone.startsWith('+')
        ? normalizedPhone.substring(1)
        : normalizedPhone;

      queryConditions.push(
        { phone: sanitizedData.phone },
        { phone: normalizedPhone },
        { phone: phoneWithPlus },
        { phone: phoneWithoutPlus }
      );
    }

    const existingUser = await User.findOne({
      $or: queryConditions,
    });

    if (existingUser) {
      // If user exists but is not verified, allow re-registration by updating the existing account
      if (!existingUser.isVerified) {
        console.log(
          `Found unverified user ${existingUser._id}, updating with new registration data`
        );

        // Update the existing user with new data
        existingUser.fullName = sanitizedData.fullName;
        existingUser.email = sanitizedData.email.toLowerCase();
        existingUser.password = sanitizedData.password; // This will be hashed by the pre-save middleware
        existingUser.role = sanitizedData.role;
        existingUser.language = sanitizedData.language || 'en';

        // Update phone if provided
        if (sanitizedData.phone && sanitizedData.phone.trim()) {
          const normalizedPhone = sanitizedData.phone.replace(
            /[\s\-\(\)]/g,
            ''
          );
          existingUser.phone = normalizedPhone.startsWith('+')
            ? normalizedPhone
            : `+${normalizedPhone}`;
        } else {
          existingUser.phone = undefined; // Clear phone if not provided
        }

        // Update official-specific fields
        if (sanitizedData.role === 'official') {
          existingUser.officialId = sanitizedData.officialId;
          existingUser.organization = sanitizedData.organization;
        } else {
          existingUser.officialId = undefined;
          existingUser.organization = undefined;
        }

        // Generate new verification token
        const verificationToken = existingUser.generateVerificationToken();

        await existingUser.save();
        console.log(
          'Unverified user updated successfully, sending new verification email...'
        );

        // Send verification email
        try {
          const emailResult = await sendVerificationEmail(
            existingUser.email,
            verificationToken,
            existingUser.fullName
          );

          if (emailResult.success) {
            console.log(
              'Verification email sent successfully:',
              emailResult.messageId
            );
          } else {
            console.error(
              'Failed to send verification email:',
              emailResult.error
            );
          }
        } catch (emailError) {
          console.error('Email sending error:', emailError);
        }

        // Return success response
        const responseData = {
          message:
            'Registration updated successfully. Please check your email for verification.',
          user: {
            id: existingUser._id,
            fullName: existingUser.fullName,
            email: existingUser.email,
            phone: existingUser.phone,
            role: existingUser.role,
            isVerified: existingUser.isVerified,
            isOfficialVerified: existingUser.isOfficialVerified,
          },
          verificationRequired: true,
        };

        return NextResponse.json(responseData, { status: 200 });
      }

      // If user exists and is verified, show conflict error
      // Check which field is causing the conflict
      let conflictField = 'account';
      if (existingUser.email === sanitizedData.email.toLowerCase()) {
        conflictField = 'email';
      } else if (sanitizedData.phone && existingUser.phone) {
        // Check phone conflict only if phone was provided
        const normalizedPhone = sanitizedData.phone.replace(/[\s\-\(\)]/g, '');
        const phoneWithPlus = normalizedPhone.startsWith('+')
          ? normalizedPhone
          : `+${normalizedPhone}`;
        const phoneWithoutPlus = normalizedPhone.startsWith('+')
          ? normalizedPhone.substring(1)
          : normalizedPhone;

        if (
          [
            sanitizedData.phone,
            normalizedPhone,
            phoneWithPlus,
            phoneWithoutPlus,
          ].includes(existingUser.phone)
        ) {
          conflictField = 'phone';
        }
      }

      console.log(
        `Registration blocked: ${conflictField} already exists for verified user ${existingUser._id}`
      );

      return NextResponse.json(
        {
          error: `An account with this ${conflictField} already exists and is verified`,
          field: conflictField,
          suggestion:
            conflictField === 'email'
              ? 'Try logging in or use a different email address'
              : 'Try logging in or use a different phone number',
        },
        { status: 409 }
      );
    }

    // Create new user
    const userData = {
      fullName: sanitizedData.fullName,
      email: sanitizedData.email.toLowerCase(),
      password: sanitizedData.password,
      role: sanitizedData.role,
      language: sanitizedData.language || 'en',
    };

    // Add phone if provided
    if (sanitizedData.phone && sanitizedData.phone.trim()) {
      const normalizedPhone = sanitizedData.phone.replace(/[\s\-\(\)]/g, '');
      userData.phone = normalizedPhone.startsWith('+')
        ? normalizedPhone
        : `+${normalizedPhone}`;
    }

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
