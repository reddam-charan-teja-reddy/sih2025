import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Report from '@/models/Report';
import Alert from '@/models/Alert';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    const radius = parseInt(searchParams.get('radius') || '10000'); // 10km default
    const includeReports = searchParams.get('includeReports') !== 'false';
    const includeAlerts = searchParams.get('includeAlerts') !== 'false';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude are required' },
        { status: 400 }
      );
    }

    const results = {};

    // Fetch reports if requested
    if (includeReports) {
      const reportQuery = {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            $maxDistance: radius,
          },
        },
        isPublic: true,
      };

      if (activeOnly) {
        reportQuery.status = { $in: ['pending', 'verified'] };
      }

      const reports = await Report.find(reportQuery)
        .populate('reportedBy', 'fullName')
        .populate('verificationStatus.verifiedBy', 'fullName organization')
        .select('-ipAddress -userAgent -reporterPhone -reporterEmail')
        .sort({ createdAt: -1 })
        .limit(100) // Limit for performance
        .lean();

      results.reports = reports.map((report) => ({
        id: report._id,
        title: report.title,
        description: report.description,
        hazardType: report.hazardType,
        severity: report.severity,
        status: report.status,
        location: report.location,
        address: report.address,
        landmark: report.landmark,
        isVerified: report.verificationStatus.isVerified,
        verifiedBy: report.verificationStatus.verifiedBy,
        verifiedAt: report.verificationStatus.verifiedAt,
        reportedBy: report.reportedBy,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        images: report.images.slice(0, 1), // Only first image for map display
        peopleAtRisk: report.peopleAtRisk,
        priority: report.priority,
        type: 'report',
      }));
    }

    // Fetch alerts if requested
    if (includeAlerts) {
      const now = new Date();
      const alertQuery = {
        affectedArea: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
          },
        },
      };

      if (activeOnly) {
        alertQuery.status = 'active';
        alertQuery.isActive = true;
        alertQuery.effectiveFrom = { $lte: now };
        alertQuery.expiresAt = { $gt: now };
      }

      const alerts = await Alert.find(alertQuery)
        .populate('issuedBy', 'fullName organization')
        .sort({ issuedAt: -1 })
        .limit(50) // Limit for performance
        .lean();

      results.alerts = alerts.map((alert) => ({
        id: alert._id,
        title: alert.title,
        message: alert.message,
        alertType: alert.alertType,
        hazardType: alert.hazardType,
        severity: alert.severity,
        urgency: alert.urgency,
        status: alert.status,
        isActive: alert.isActive,
        affectedArea: alert.affectedArea,
        affectedLocations: alert.affectedLocations,
        issuedBy: alert.issuedBy,
        organization: alert.organization,
        issuedAt: alert.issuedAt,
        effectiveFrom: alert.effectiveFrom,
        expiresAt: alert.expiresAt,
        instructions: alert.instructions.slice(0, 3), // Only first 3 instructions
        images: alert.images.slice(0, 1), // Only first image
        emergencyContacts: alert.emergencyContacts,
        type: 'alert',
      }));
    }

    // Add metadata
    results.metadata = {
      center: { lat, lng },
      radius,
      timestamp: new Date().toISOString(),
      totalReports: results.reports?.length || 0,
      totalAlerts: results.alerts?.length || 0,
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching map data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch map data' },
      { status: 500 }
    );
  }
}
