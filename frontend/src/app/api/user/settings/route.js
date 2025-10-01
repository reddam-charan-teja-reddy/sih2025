import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyToken, guestMiddleware } from '@/lib/auth';

export async function GET(request) {
  try {
    await dbConnect();

    // Allow guest session to read default settings
    const guestAuth = await guestMiddleware(request);
    if (guestAuth.error) {
      return NextResponse.json(
        { error: guestAuth.error },
        { status: guestAuth.status }
      );
    }

    if (guestAuth.isGuest) {
      const defaultSettings = {
        notifications: {
          pushEnabled: true,
          emailEnabled: false,
          smsEnabled: false,
          emergencyAlerts: true,
          weeklyReports: false,
          soundEnabled: true,
        },
        map: {
          defaultZoom: 12,
          autoLocation: true,
          showClusters: true,
          mapStyle: 'standard',
          refreshInterval: 30,
        },
        privacy: {
          shareLocation: true,
          profileVisible: false,
          analyticsEnabled: true,
        },
        display: {
          theme: 'system',
          language: 'en',
          timezone: 'auto',
        },
      };
      return NextResponse.json({
        settings: defaultSettings,
        message: 'Guest default settings',
      });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : request.cookies.get('token')?.value;
    const decoded = verifyToken(token);

    // Find the user
    const user = await User.findById(decoded.userId).select('settings').lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return default settings if none exist
    const defaultSettings = {
      notifications: {
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        emergencyAlerts: true,
        weeklyReports: true,
        soundEnabled: true,
      },
      map: {
        defaultZoom: 12,
        autoLocation: true,
        showClusters: true,
        mapStyle: 'standard',
        refreshInterval: 30,
      },
      privacy: {
        shareLocation: true,
        profileVisible: false,
        analyticsEnabled: true,
      },
      display: {
        theme: 'system',
        language: 'en',
        timezone: 'auto',
      },
    };

    return NextResponse.json({
      settings: user.settings || defaultSettings,
      message: 'Settings retrieved successfully',
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    await dbConnect();

    // Allow guest users to save settings for the session (no DB persistence)
    const guestAuth = await guestMiddleware(request);
    if (guestAuth.isGuest) {
      const settings = await request.json();
      return NextResponse.json({
        settings,
        message: 'Guest settings saved for session',
      });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : request.cookies.get('token')?.value;
    const decoded = verifyToken(token);

    // Parse the request body
    const settings = await request.json();

    // Validate settings structure
    const validSections = ['notifications', 'map', 'privacy', 'display'];
    for (const section of Object.keys(settings)) {
      if (!validSections.includes(section)) {
        return NextResponse.json(
          { error: `Invalid settings section: ${section}` },
          { status: 400 }
        );
      }
    }

    // Update the user's settings
    const updatedUser = await User.findByIdAndUpdate(
      decoded.userId,
      {
        settings: settings,
        updatedAt: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .select('settings')
      .lean();

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      settings: updatedUser.settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Settings PUT error:', error);

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
