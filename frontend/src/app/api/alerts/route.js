import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Alert from '@/models/Alert';
import { verifyToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { generateMediaUrls } from '@/lib/storage';

// Rate limiting configuration
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 alert creations per windowMs
  message: 'Too many alert creations, please try again later.',
});

export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter(request);
    if (rateLimitResult) return rateLimitResult;

    await connectDB();

    // Verify authentication - only officials can create alerts
    const authResult = await verifyToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Check if user is a verified official
    if (user.role !== 'official' || !user.isOfficialVerified) {
      return NextResponse.json(
        { error: 'Only verified officials can create alerts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      message,
      alertType,
      hazardType,
      severity,
      urgency,
      affectedArea,
      radius,
      affectedLocations = [],
      effectiveFrom,
      expiresAt,
      instructions = [],
      safetyTips = [],
      images = [],
      attachments = [],
      emergencyContacts = [],
      targetAudience = 'all',
      distributionChannels = ['app_notification'],
      language = 'all',
      tags = [],
      category,
      externalReferences = [],
    } = body;

    // Validate required fields
    if (
      !title ||
      !message ||
      !alertType ||
      !hazardType ||
      !severity ||
      !urgency
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!affectedArea || !affectedArea.type || !affectedArea.coordinates) {
      return NextResponse.json(
        { error: 'Affected area information is required' },
        { status: 400 }
      );
    }

    if (!effectiveFrom || !expiresAt) {
      return NextResponse.json(
        { error: 'Effective date and expiry date are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const effectiveDate = new Date(effectiveFrom);
    const expiryDate = new Date(expiresAt);
    const now = new Date();

    if (effectiveDate < now) {
      return NextResponse.json(
        { error: 'Effective date cannot be in the past' },
        { status: 400 }
      );
    }

    if (expiryDate <= effectiveDate) {
      return NextResponse.json(
        { error: 'Expiry date must be after effective date' },
        { status: 400 }
      );
    }

    // Validate affected area format
    let processedAffectedArea = { ...affectedArea };

    if (affectedArea.type === 'Circle') {
      if (!radius || radius < 100 || radius > 100000) {
        return NextResponse.json(
          { error: 'Radius must be between 100m and 100km for Circle type' },
          { status: 400 }
        );
      }
      processedAffectedArea = {
        type: 'Circle',
        coordinates: {
          center: affectedArea.coordinates,
          radius: radius,
        },
      };
    }

    // Create the alert
    const alertData = {
      title: title.trim(),
      message: message.trim(),
      alertType,
      hazardType,
      severity,
      urgency,
      issuedBy: user.id,
      issuerName: user.fullName,
      organization: user.organization || 'Government Authority',
      contactInfo: {
        phone: user.phone,
        email: user.email,
      },
      affectedArea: processedAffectedArea,
      radius: affectedArea.type === 'Circle' ? radius : undefined,
      affectedLocations: affectedLocations.map((loc) => ({
        name: loc.name.trim(),
        type: loc.type,
        coordinates: loc.coordinates,
      })),
      effectiveFrom: effectiveDate,
      expiresAt: expiryDate,
      instructions: instructions.map((inst, index) => ({
        action: inst.action.trim(),
        description: inst.description?.trim(),
        priority: inst.priority || index + 1,
      })),
      safetyTips: safetyTips
        .filter((tip) => tip.trim())
        .map((tip) => tip.trim()),
      images: images.map((img) => ({
        url: img.url,
        fileName: img.fileName,
        caption: img.caption?.trim(),
      })),
      attachments: attachments.map((att) => ({
        url: att.url,
        fileName: att.fileName,
        fileType: att.fileType,
        description: att.description?.trim(),
      })),
      emergencyContacts: emergencyContacts.map((contact) => ({
        name: contact.name.trim(),
        role: contact.role.trim(),
        phone: contact.phone.trim(),
        email: contact.email?.trim(),
        isAvailable24x7: Boolean(contact.isAvailable24x7),
      })),
      targetAudience,
      distributionChannels,
      language,
      tags: tags
        .filter((tag) => tag.trim())
        .map((tag) => tag.trim().toLowerCase()),
      category,
      externalReferences: externalReferences.map((ref) => ({
        source: ref.source.trim(),
        url: ref.url?.trim(),
        description: ref.description?.trim(),
      })),
      source: 'web_dashboard',
      status: 'draft', // Start as draft
    };

    const alert = new Alert(alertData);
    await alert.save();

    // If this is an immediate alert, activate it right away
    if (urgency === 'immediate' && effectiveDate <= now) {
      await alert.activate();
    }

    // Return the created alert
    const responseAlert = await Alert.findById(alert._id)
      .populate('issuedBy', 'fullName organization')
      .lean();

    return NextResponse.json(
      {
        message: 'Alert created successfully',
        alert: responseAlert,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating alert:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create alert' },
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
    const alertType = searchParams.get('alertType');
    const hazardType = searchParams.get('hazardType');
    const severity = searchParams.get('severity');
    const isActive = searchParams.get('isActive');
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    const radius = parseInt(searchParams.get('radius') || '10000'); // 10km default
    const sortBy = searchParams.get('sortBy') || 'issuedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const onlyActive = searchParams.get('onlyActive') === 'true';

    // Build query
    const query = {};

    // Add 3-day filter for recent data (performance optimization)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    query.issuedAt = { $gte: threeDaysAgo };

    if (onlyActive) {
      const now = new Date();
      query.status = 'active';
      query.isActive = true;
      query.effectiveFrom = { $lte: now };
      query.expiresAt = { $gt: now };
    } else {
      if (status) query.status = status;
      if (isActive !== null) query.isActive = isActive === 'true';
    }

    if (alertType) query.alertType = alertType;
    if (hazardType) query.hazardType = hazardType;
    if (severity) query.severity = severity;

    // Location-based filtering
    if (!isNaN(lat) && !isNaN(lng)) {
      query.affectedArea = {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        },
      };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .populate('issuedBy', 'fullName organization')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Alert.countDocuments(query),
    ]);

    // Generate fresh signed URLs for media files on-demand
    const alertsWithUrls = await Promise.all(
      alerts.map(async (alert) => {
        if (alert.media && alert.media.length > 0) {
          try {
            alert.media = await generateMediaUrls(alert.media);
          } catch (error) {
            console.error(
              `❌ Failed to generate URLs for alert ${alert._id}:`,
              error
            );
            // Keep original media array if URL generation fails
          }
        }
        return alert;
      })
    );

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      alerts: alertsWithUrls,
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
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
