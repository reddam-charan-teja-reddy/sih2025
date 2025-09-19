import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Report from '@/models/Report';
import { authMiddleware } from '@/lib/auth';
import { generalAPIRateLimit } from '@/lib/rateLimit';
import { validateFile, generateSignedUploadUrl } from '@/lib/storage';

export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = generalAPIRateLimit.check(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter.toString(),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
          },
        }
      );
    }

    await connectDB();

    // Verify authentication
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;

    // Check if user can submit reports (no guest mode)
    if (user.isGuest) {
      return NextResponse.json(
        { error: 'Guest users cannot submit reports. Please sign in.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      hazardType,
      severity,
      location,
      address,
      landmark,
      peopleAtRisk,
      emergencyContact,
      images = [],
      videos = [],
      tags = [],
    } = body;

    // Validate required fields
    if (!title || !description || !hazardType || !severity || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate location format
    if (
      !location.coordinates ||
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      return NextResponse.json(
        { error: 'Invalid location coordinates' },
        { status: 400 }
      );
    }

    // Validate coordinates range
    const [longitude, latitude] = location.coordinates;
    if (
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      return NextResponse.json(
        { error: 'Coordinates out of valid range' },
        { status: 400 }
      );
    }

    // Create the report
    const reportData = {
      title: title.trim(),
      description: description.trim(),
      hazardType,
      severity,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      address: address?.trim(),
      landmark: landmark?.trim(),
      reportedBy: user.id,
      reporterName: user.fullName,
      reporterPhone: user.phone,
      reporterEmail: user.email,
      peopleAtRisk: Boolean(peopleAtRisk),
      emergencyContact: emergencyContact || {},
      images: images.map((img) => ({
        url: img.url,
        fileName: img.fileName,
        caption: img.caption?.trim(),
        uploadedAt: new Date(),
      })),
      videos: videos.map((vid) => ({
        url: vid.url,
        fileName: vid.fileName,
        duration: vid.duration,
        caption: vid.caption?.trim(),
        uploadedAt: new Date(),
      })),
      tags: tags
        .filter((tag) => tag.trim())
        .map((tag) => tag.trim().toLowerCase()),
      source: 'web_app',
      ipAddress:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    // Set priority based on severity and people at risk
    let priority = 5; // default
    if (severity === 'critical') priority = 10;
    else if (severity === 'high') priority = 8;
    else if (severity === 'medium') priority = 6;
    else if (severity === 'low') priority = 4;

    if (peopleAtRisk) priority = Math.min(10, priority + 2);

    reportData.priority = priority;

    const report = new Report(reportData);
    await report.save();

    // Add initial update
    await report.addUpdate({
      updatedBy: user.id,
      updateType: 'status_change',
      message: 'Report submitted successfully and is pending verification.',
      isPublic: true,
    });

    // Return the created report (without sensitive data)
    const responseReport = await Report.findById(report._id)
      .populate('reportedBy', 'fullName email')
      .select('-ipAddress -userAgent');

    return NextResponse.json(
      {
        message: 'Report submitted successfully',
        report: responseReport,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating report:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const hazardType = searchParams.get('hazardType');
    const severity = searchParams.get('severity');
    const reportedBy = searchParams.get('reportedBy');
    const isVerified = searchParams.get('isVerified');
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    const radius = parseInt(searchParams.get('radius') || '10000'); // 10km default
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query = { isPublic: true };

    if (status) query.status = status;
    if (hazardType) query.hazardType = hazardType;
    if (severity) query.severity = severity;
    if (reportedBy) query.reportedBy = reportedBy;
    if (isVerified !== null) {
      query['verificationStatus.isVerified'] = isVerified === 'true';
    }

    // Location-based filtering
    if (!isNaN(lat) && !isNaN(lng)) {
      query.location = {
        $geoWithin: {
          $centerSphere: [[lng, lat], radius / 6378100], // Convert meters to radians
        },
      };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;

    // Fetch reports and total count separately using async/await
    const reports = await Report.find(query)
      .populate('reportedBy', 'fullName')
      .populate('verificationStatus.verifiedBy', 'fullName organization')
      .select('-ipAddress -userAgent')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Report.countDocuments(query);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      reports,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
