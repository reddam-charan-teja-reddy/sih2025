import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema(
  {
    // Basic Information
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Report description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    // Reporter Information
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter ID is required'],
    },
    reporterName: {
      type: String,
      required: true,
      trim: true,
    },
    reporterPhone: {
      type: String,
      trim: true,
    },
    reporterEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    // Hazard Details
    hazardType: {
      type: String,
      required: [true, 'Hazard type is required'],
      enum: [
        'flood',
        'fire',
        'landslide',
        'storm',
        'roadblock',
        'accident',
        'medical',
        'marine_emergency',
        'pollution',
        'infrastructure',
        'other',
      ],
    },
    severity: {
      type: String,
      required: [true, 'Severity level is required'],
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    // Location Information
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (coords) {
            return (
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 && // longitude
              coords[1] >= -90 &&
              coords[1] <= 90
            ); // latitude
          },
          message:
            'Invalid coordinates. Must be [longitude, latitude] within valid ranges.',
        },
      },
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: [200, 'Landmark cannot exceed 200 characters'],
    },

    // Media Files
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        fileName: {
          type: String,
          required: true,
        },
        caption: {
          type: String,
          maxlength: [200, 'Caption cannot exceed 200 characters'],
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    videos: [
      {
        url: {
          type: String,
          required: true,
        },
        fileName: {
          type: String,
          required: true,
        },
        duration: {
          type: Number, // in seconds
        },
        caption: {
          type: String,
          maxlength: [200, 'Caption cannot exceed 200 characters'],
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Status and Verification
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'resolved', 'archived'],
      default: 'pending',
    },
    verificationStatus: {
      isVerified: {
        type: Boolean,
        default: false,
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verifiedAt: {
        type: Date,
      },
      verificationNotes: {
        type: String,
        maxlength: [1000, 'Verification notes cannot exceed 1000 characters'],
      },
    },

    // Additional Details
    peopleAtRisk: {
      type: Boolean,
      default: false,
    },
    emergencyContact: {
      name: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
    },

    // Official Response
    officialResponse: {
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      responseTime: {
        type: Date,
      },
      actionTaken: {
        type: String,
        maxlength: [1000, 'Action taken cannot exceed 1000 characters'],
      },
      resourcesDeployed: [
        {
          type: {
            type: String,
            enum: ['personnel', 'vehicle', 'equipment', 'medical', 'other'],
          },
          description: {
            type: String,
            maxlength: [
              200,
              'Resource description cannot exceed 200 characters',
            ],
          },
          quantity: {
            type: Number,
            min: 1,
          },
        },
      ],
      estimatedResolutionTime: {
        type: Date,
      },
      actualResolutionTime: {
        type: Date,
      },
    },

    // Timeline and Updates
    updates: [
      {
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        updateType: {
          type: String,
          enum: [
            'status_change',
            'additional_info',
            'resource_deployment',
            'resolution',
            'note',
          ],
          required: true,
        },
        message: {
          type: String,
          required: true,
          maxlength: [1000, 'Update message cannot exceed 1000 characters'],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        isPublic: {
          type: Boolean,
          default: true, // Whether citizens can see this update
        },
      },
    ],

    // Metadata
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [50, 'Tag cannot exceed 50 characters'],
      },
    ],
    isPublic: {
      type: Boolean,
      default: true, // Whether the report is visible to all users
    },
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },

    // System Information
    source: {
      type: String,
      enum: [
        'mobile_app',
        'web_app',
        'emergency_call',
        'official_report',
        'api',
      ],
      default: 'web_app',
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
ReportSchema.index({ location: '2dsphere' }); // Geospatial index for location queries
ReportSchema.index({ reportedBy: 1, createdAt: -1 }); // User reports sorted by date
ReportSchema.index({ status: 1, severity: 1 }); // Status and severity filtering
ReportSchema.index({ hazardType: 1, createdAt: -1 }); // Hazard type filtering
ReportSchema.index({ 'verificationStatus.isVerified': 1, status: 1 }); // Verification status
ReportSchema.index({ createdAt: -1 }); // Recent reports
ReportSchema.index({ tags: 1 }); // Tag-based filtering

// Virtual fields
ReportSchema.virtual('isActive').get(function () {
  return ['pending', 'verified'].includes(this.status);
});

ReportSchema.virtual('isResolved').get(function () {
  return ['resolved', 'archived'].includes(this.status);
});

ReportSchema.virtual('responseTime').get(function () {
  if (this.officialResponse?.responseTime && this.createdAt) {
    return this.officialResponse.responseTime - this.createdAt;
  }
  return null;
});

ReportSchema.virtual('resolutionTime').get(function () {
  if (this.officialResponse?.actualResolutionTime && this.createdAt) {
    return this.officialResponse.actualResolutionTime - this.createdAt;
  }
  return null;
});

// Instance methods
ReportSchema.methods.addUpdate = function (updateData) {
  this.updates.push({
    ...updateData,
    timestamp: new Date(),
  });
  return this.save();
};

ReportSchema.methods.verify = function (officialId, notes = '') {
  this.verificationStatus.isVerified = true;
  this.verificationStatus.verifiedBy = officialId;
  this.verificationStatus.verifiedAt = new Date();
  this.verificationStatus.verificationNotes = notes;
  this.status = 'verified';

  return this.addUpdate({
    updatedBy: officialId,
    updateType: 'status_change',
    message: `Report verified by official. ${notes}`,
    isPublic: true,
  });
};

ReportSchema.methods.reject = function (officialId, reason = '') {
  this.status = 'rejected';

  return this.addUpdate({
    updatedBy: officialId,
    updateType: 'status_change',
    message: `Report rejected. Reason: ${reason}`,
    isPublic: false,
  });
};

ReportSchema.methods.resolve = function (officialId, resolution = '') {
  this.status = 'resolved';
  this.officialResponse.actualResolutionTime = new Date();

  return this.addUpdate({
    updatedBy: officialId,
    updateType: 'resolution',
    message: `Report resolved. ${resolution}`,
    isPublic: true,
  });
};

// Static methods
ReportSchema.statics.findNearby = function (
  longitude,
  latitude,
  maxDistance = 10000
) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance, // in meters
      },
    },
    status: { $in: ['pending', 'verified'] },
  });
};

ReportSchema.statics.findByHazardType = function (hazardType) {
  return this.find({
    hazardType,
    status: { $in: ['pending', 'verified'] },
  }).sort({ createdAt: -1 });
};

ReportSchema.statics.findActiveReports = function () {
  return this.find({
    status: { $in: ['pending', 'verified'] },
  }).sort({ severity: -1, createdAt: -1 });
};

ReportSchema.statics.getStatistics = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const hazardStats = await this.aggregate([
    {
      $group: {
        _id: '$hazardType',
        count: { $sum: 1 },
      },
    },
  ]);

  return { statusStats: stats, hazardStats };
};

// Pre-save middleware
ReportSchema.pre('save', function (next) {
  // Auto-generate title if not provided
  if (!this.title && this.hazardType) {
    const hazardNames = {
      flood: 'Flood',
      fire: 'Fire Emergency',
      landslide: 'Landslide',
      storm: 'Storm Warning',
      roadblock: 'Road Blockage',
      accident: 'Accident',
      medical: 'Medical Emergency',
      marine_emergency: 'Marine Emergency',
      pollution: 'Pollution',
      infrastructure: 'Infrastructure Issue',
      other: 'Emergency Report',
    };

    this.title = `${hazardNames[this.hazardType]} Report`;
  }

  next();
});

// Ensure virtual fields are serialized
ReportSchema.set('toJSON', { virtuals: true });
ReportSchema.set('toObject', { virtuals: true });

const Report = mongoose.models.Report || mongoose.model('Report', ReportSchema);

export default Report;
