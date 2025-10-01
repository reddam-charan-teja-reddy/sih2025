import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

// POST /api/admin/officials/approve
// Secure admin-only endpoint to promote an existing user to 'official'
// and optionally mark both account and official status as verified.
// Security: requires header `x-admin-secret` to match process.env.ADMIN_SECRET
// Body: { email | phone | userId, officialId?, organization?, verifyOfficial=true, verifyAccount=true }
export async function POST(request) {
  try {
    const adminSecretHeader = request.headers.get('x-admin-secret');
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
      return NextResponse.json(
        { error: 'Server misconfigured: ADMIN_SECRET not set' },
        { status: 500 }
      );
    }

    if (!adminSecretHeader || adminSecretHeader !== adminSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: invalid admin secret' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, phone, userId, officialId, organization } = body || {};
    const verifyOfficial = body?.verifyOfficial !== false; // default true
    const verifyAccount = body?.verifyAccount !== false; // default true

    if (!email && !phone && !userId) {
      return NextResponse.json(
        { error: 'Provide one of: email, phone, or userId' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user
    const query = userId
      ? { _id: userId }
      : email
      ? { email: String(email).toLowerCase() }
      : { phone };

    const user = await User.findOne(query);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found with provided identifier' },
        { status: 404 }
      );
    }

    // Promote and update fields
    user.role = 'official';
    if (officialId) user.officialId = officialId;
    if (organization) user.organization = organization;
    if (verifyAccount) user.isVerified = true;
    if (verifyOfficial) user.isOfficialVerified = true;

    await user.save();

    return NextResponse.json(
      {
        message: 'User promoted to official successfully',
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          isOfficialVerified: user.isOfficialVerified,
          officialId: user.officialId || null,
          organization: user.organization || null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Approve official error:', error);
    return NextResponse.json(
      { error: 'Failed to approve official' },
      { status: 500 }
    );
  }
}
