import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyToken, guestMiddleware } from '@/lib/auth';

export async function GET(request) {
  try {
    await dbConnect();

    // Allow guest session as citizen-equivalent read-only profile
    const guestAuth = await guestMiddleware(request);
    if (guestAuth.error) {
      return NextResponse.json(
        { error: guestAuth.error },
        { status: guestAuth.status }
      );
    }

    if (guestAuth.isGuest) {
      return NextResponse.json({
        user: {
          id: null,
          fullName: 'Guest User',
          role: 'citizen',
          isVerified: false,
        },
        message: 'Guest profile',
      });
    }

    // Authenticated user profile
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : request.cookies.get('token')?.value;
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId)
      .select('-password -refreshTokens')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user,
      message: 'Profile retrieved successfully',
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    await dbConnect();

    // Guests should not update persistent profile; allow only authenticated users
    const guestAuth = await guestMiddleware(request);
    if (guestAuth.isGuest) {
      return NextResponse.json(
        { error: 'Guest profile cannot be updated. Please sign in.' },
        { status: 403 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : request.cookies.get('token')?.value;
    const decoded = verifyToken(token);

    // Parse the request body
    const body = await request.json();
    const { fullName, email, phone, location, emergencyContact, organization } =
      body;

    // Validate required fields
    if (!fullName?.trim()) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: decoded.userId },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use by another account' },
        { status: 409 }
      );
    }

    // Prepare update data
    const updateData = {
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      updatedAt: new Date(),
    };

    // Add optional fields if provided
    if (phone?.trim()) {
      updateData.phone = phone.trim();
    }

    if (location?.trim()) {
      updateData.location = location.trim();
    }

    if (emergencyContact?.trim()) {
      updateData.emergencyContact = emergencyContact.trim();
    }

    if (organization?.trim()) {
      updateData.organization = organization.trim();
    }

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      decoded.userId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .select('-password -refreshTokens')
      .lean();

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Profile PUT error:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return NextResponse.json(
        { error: `Validation error: ${validationErrors.join(', ')}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
