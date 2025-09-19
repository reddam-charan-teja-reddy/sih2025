import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Report from '@/models/Report';
import { verifyToken } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    await connectDB();

    const reportId = params.id;

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // Find the report
    const report = await Report.findById(reportId)
      .populate('reportedBy', 'fullName email phone')
      .populate('verificationStatus.verifiedBy', 'fullName organization')
      .populate('officialResponse.respondedBy', 'fullName organization')
      .populate('updates.updatedBy', 'fullName role')
      .lean();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if report is public or user has permission to view
    const authResult = await verifyToken(request);
    let canViewPrivate = false;

    if (authResult.success) {
      const { user } = authResult;
      // User can view their own reports, officials can view all
      canViewPrivate =
        user.id === report.reportedBy._id.toString() ||
        (user.role === 'official' && user.isOfficialVerified);
    }

    if (!report.isPublic && !canViewPrivate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Filter sensitive information for non-authorized users
    if (!canViewPrivate) {
      delete report.ipAddress;
      delete report.userAgent;
      delete report.reporterPhone;
      delete report.reporterEmail;
      // Filter private updates
      report.updates = report.updates.filter((update) => update.isPublic);
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();

    const authResult = await verifyToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const reportId = params.id;

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = user.id === report.reportedBy.toString();
    const isOfficial = user.role === 'official' && user.isOfficialVerified;

    if (!isOwner && !isOfficial) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { action, ...updateData } = body;

    let updatedReport;

    // Handle different actions
    switch (action) {
      case 'verify':
        if (!isOfficial) {
          return NextResponse.json(
            { error: 'Only officials can verify reports' },
            { status: 403 }
          );
        }
        updatedReport = await report.verify(user.id, updateData.notes);
        break;

      case 'reject':
        if (!isOfficial) {
          return NextResponse.json(
            { error: 'Only officials can reject reports' },
            { status: 403 }
          );
        }
        updatedReport = await report.reject(user.id, updateData.reason);
        break;

      case 'resolve':
        if (!isOfficial) {
          return NextResponse.json(
            { error: 'Only officials can resolve reports' },
            { status: 403 }
          );
        }
        updatedReport = await report.resolve(user.id, updateData.resolution);
        break;

      case 'add_update':
        const updateType = updateData.updateType || 'note';
        const message = updateData.message;
        const isPublic = updateData.isPublic !== false; // default to true

        if (!message) {
          return NextResponse.json(
            { error: 'Update message is required' },
            { status: 400 }
          );
        }

        updatedReport = await report.addUpdate({
          updatedBy: user.id,
          updateType,
          message,
          isPublic,
        });
        break;

      case 'update_response':
        if (!isOfficial) {
          return NextResponse.json(
            { error: 'Only officials can update response details' },
            { status: 403 }
          );
        }

        if (updateData.actionTaken) {
          report.officialResponse.actionTaken = updateData.actionTaken;
        }
        if (updateData.resourcesDeployed) {
          report.officialResponse.resourcesDeployed =
            updateData.resourcesDeployed;
        }
        if (updateData.estimatedResolutionTime) {
          report.officialResponse.estimatedResolutionTime = new Date(
            updateData.estimatedResolutionTime
          );
        }
        if (!report.officialResponse.responseTime) {
          report.officialResponse.responseTime = new Date();
          report.officialResponse.respondedBy = user.id;
        }

        updatedReport = await report.save();
        break;

      case 'update_basic':
        // Only owner can update basic info and only if not yet verified
        if (!isOwner) {
          return NextResponse.json(
            { error: 'Only report owner can update basic information' },
            { status: 403 }
          );
        }

        if (report.verificationStatus.isVerified) {
          return NextResponse.json(
            { error: 'Cannot update verified reports' },
            { status: 400 }
          );
        }

        const allowedFields = ['title', 'description', 'severity', 'tags'];
        allowedFields.forEach((field) => {
          if (updateData[field] !== undefined) {
            report[field] = updateData[field];
          }
        });

        updatedReport = await report.save();
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Return updated report
    const responseReport = await Report.findById(updatedReport._id)
      .populate('reportedBy', 'fullName email')
      .populate('verificationStatus.verifiedBy', 'fullName organization')
      .populate('officialResponse.respondedBy', 'fullName organization')
      .populate('updates.updatedBy', 'fullName role')
      .select('-ipAddress -userAgent');

    return NextResponse.json({
      message: 'Report updated successfully',
      report: responseReport,
    });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const authResult = await verifyToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const reportId = params.id;

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check permissions - only report owner or admin can delete
    const isOwner = user.id === report.reportedBy.toString();
    const isAdmin = user.role === 'official' && user.isOfficialVerified;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Don't actually delete, just archive
    report.status = 'archived';
    report.isPublic = false;
    await report.addUpdate({
      updatedBy: user.id,
      updateType: 'status_change',
      message: 'Report archived',
      isPublic: false,
    });

    await report.save();

    return NextResponse.json({
      message: 'Report archived successfully',
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    );
  }
}
