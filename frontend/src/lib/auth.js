import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import User from '@/models/User';
import connectDB from '@/lib/db';

export const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const authMiddleware = async (request) => {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return { success: false, error: 'Access token required', status: 401 };
    }

    const decoded = await verifyToken(token);

    await connectDB();
    const user = await User.findById(decoded.id);

    if (!user) {
      return { success: false, error: 'User not found', status: 401 };
    }

    if (!user.isVerified) {
      return {
        success: false,
        error: 'Please verify your account',
        status: 403,
      };
    }

    return { success: true, user, decoded };
  } catch (error) {
    return { success: false, error: 'Invalid or expired token', status: 401 };
  }
};

export const roleMiddleware = (allowedRoles) => {
  return (user) => {
    if (!allowedRoles.includes(user.role)) {
      return { error: 'Insufficient permissions', status: 403 };
    }
    return { success: true };
  };
};

export const guestMiddleware = async (request) => {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return { user: null, isGuest: true };
    }

    // Check if it's a guest token
    if (token.startsWith('guest_')) {
      // Strip the guest_ prefix before verifying the JWT
      const rawToken = token.replace(/^guest_/, '');
      const guestData = jwt.verify(rawToken, process.env.JWT_SECRET);
      if (Date.now() > guestData.exp * 1000) {
        return { error: 'Guest session expired', status: 401 };
      }
      return { user: null, isGuest: true, guestData };
    }

    // Regular auth check
    const authResult = await authMiddleware(request);
    return { ...authResult, isGuest: false };
  } catch (error) {
    return { error: 'Invalid token', status: 401 };
  }
};

export const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const generateGuestToken = () => {
  const guestToken = jwt.sign(
    {
      type: 'guest',
      exp: Math.floor(Date.now() / 1000) + 10 * 60, // 10 minutes
    },
    process.env.JWT_SECRET
  );

  return `guest_${guestToken}`;
};

export const withAuth = (handler, requiredRoles = []) => {
  return async (request, context) => {
    const authResult = await authMiddleware(request);

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    if (requiredRoles.length > 0) {
      const roleCheck = roleMiddleware(requiredRoles)(authResult.user);
      if (roleCheck.error) {
        return NextResponse.json(
          { error: roleCheck.error },
          { status: roleCheck.status }
        );
      }
    }

    // Add user to request context
    request.user = authResult.user;
    return handler(request, context);
  };
};
