import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema(
  {
    // Basic Information
    title: {
      type: String,
      required: [true, 'Alert title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Alert message is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },

    // Alert Type and Classification
    alertType: {
      type: String,
      required: [true, 'Alert type is required'],
      enum: [
        'emergency', // Immediate danger
        'warning', // Potential danger
        'advisory', // General information
        'all_clear', // Danger has passed
        'update', // Update to existing alert
      ],
    },
    hazardType: {
      type: String,
      required: [true, 'Hazard type is required'],
      enum: [
        'flood',
        'fire',
        'landslide',
        'storm',
        'tsunami',
        'cyclone',
        'earthquake',
        'pollution',
        'infrastructure',
        'marine_emergency',
        'weather',
        'traffic',
        'security',
        'other',
      ],
    },
    severity: {
      type: String,
      required: [true, 'Severity level is required'],
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    urgency: {
      type: String,
      required: [true, 'Urgency level is required'],
      enum: ['immediate', 'expected', 'future', 'past'],
      default: 'expected',
    },

    // Official Information
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Alert issuer is required'],
    },
    issuerName: {
      type: String,
      required: true,
      trim: true,
    },
    organization: {
      type: String,
      required: true,
      trim: true,
    },
    contactInfo: {
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
    },

    // Geographic Coverage
    affectedArea: {
      type: {
        type: String,
        enum: ['Polygon', 'Circle', 'Point'],
        required: true,
      },
      coordinates: {
        type: mongoose.Schema.Types.Mixed, // Different formats for different types
        required: true,
      },
      // For Circle type: { center: [lng, lat], radius: number }
      // For Polygon type: [[[lng, lat], [lng, lat], ...]]
      // For Point type: [lng, lat]
    },
    radius: {
      type: Number, // in meters, used for Circle type
      min: 100,
      max: 100000, // max 100km radius
    },
    affectedLocations: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        type: {
          type: String,
          enum: ['city', 'district', 'area', 'landmark', 'coordinates'],
          required: true,
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
        },
      },
    ],

    // Timeline
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      validate: {
        validator: function (date) {
          return date > this.effectiveFrom;
        },
        message: 'Expiry date must be after effective date',
      },
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },

    // Status and Lifecycle
    status: {
      type: String,
      enum: ['draft', 'active', 'updated', 'expired', 'cancelled', 'archived'],
      default: 'draft',
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Content and Instructions
    instructions: [
      {
        action: {
          type: String,
          required: true,
          trim: true,
          maxlength: [200, 'Action cannot exceed 200 characters'],
        },
        description: {
          type: String,
          trim: true,
          maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        priority: {
          type: Number,
          min: 1,
          max: 10,
          default: 5,
        },
      },
    ],
    safetyTips: [
      {
        type: String,
        trim: true,
        maxlength: [300, 'Safety tip cannot exceed 300 characters'],
      },
    ],

    // Media and Resources
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
      },
    ],
    attachments: [
      {
        url: {
          type: String,
          required: true,
        },
        fileName: {
          type: String,
          required: true,
        },
        fileType: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          maxlength: [200, 'Description cannot exceed 200 characters'],
        },
      },
    ],

    // Related Information
    relatedReports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report',
      },
    ],
    parentAlert: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert', // For updates to existing alerts
    },
    childAlerts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alert', // Follow-up alerts
      },
    ],

    // Emergency Contacts
    emergencyContacts: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        role: {
          type: String,
          required: true,
          trim: true,
        },
        phone: {
          type: String,
          required: true,
          trim: true,
        },
        email: {
          type: String,
          trim: true,
          lowercase: true,
        },
        isAvailable24x7: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Distribution and Reach
    targetAudience: {
      type: String,
      enum: [
        'all',
        'citizens',
        'officials',
        'emergency_responders',
        'tourists',
        'fishermen',
      ],
      default: 'all',
    },
    distributionChannels: [
      {
        type: String,
        enum: [
          'app_notification',
          'sms',
          'email',
          'public_announcement',
          'radio',
          'tv',
        ],
      },
    ],
    language: {
      type: String,
      enum: ['en', 'te', 'hi', 'all'],
      default: 'all',
    },

    // Metrics and Analytics
    metrics: {
      viewCount: {
        type: Number,
        default: 0,
      },
      acknowledgmentCount: {
        type: Number,
        default: 0,
      },
      shareCount: {
        type: Number,
        default: 0,
      },
      reachEstimate: {
        type: Number,
        default: 0,
      },
    },

    // System Information
    source: {
      type: String,
      enum: [
        'web_dashboard',
        'mobile_app',
        'emergency_system',
        'api',
        'automated',
      ],
      default: 'web_dashboard',
    },
    automaticExpiry: {
      type: Boolean,
      default: true,
    },

    // Updates and Revisions
    revisionHistory: [
      {
        revisedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        revisedAt: {
          type: Date,
          default: Date.now,
        },
        changeType: {
          type: String,
          enum: [
            'content_update',
            'time_extension',
            'area_modification',
            'status_change',
            'cancellation',
          ],
          required: true,
        },
        changeDescription: {
          type: String,
          required: true,
          maxlength: [500, 'Change description cannot exceed 500 characters'],
        },
        previousVersion: {
          type: mongoose.Schema.Types.Mixed, // Store previous state
        },
      },
    ],

    // Tags and Categories
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [50, 'Tag cannot exceed 50 characters'],
      },
    ],
    category: {
      type: String,
      enum: [
        'natural_disaster',
        'man_made',
        'weather',
        'infrastructure',
        'security',
        'health',
        'environmental',
      ],
    },

    // External References
    externalReferences: [
      {
        source: {
          type: String,
          required: true,
          trim: true,
        },
        url: {
          type: String,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
          maxlength: [200, 'Description cannot exceed 200 characters'],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
AlertSchema.index({ affectedArea: '2dsphere' }); // Geospatial index
AlertSchema.index({ status: 1, isActive: 1 }); // Active alerts
AlertSchema.index({ hazardType: 1, severity: 1 }); // Hazard filtering
AlertSchema.index({ issuedAt: -1 }); // Recent alerts
AlertSchema.index({ expiresAt: 1 }); // Expiry management
AlertSchema.index({ 'affectedLocations.coordinates': '2dsphere' }); // Location-based queries
AlertSchema.index({ tags: 1 }); // Tag-based filtering
AlertSchema.index({ targetAudience: 1, language: 1 }); // Audience targeting

// Virtual fields
AlertSchema.virtual('isExpired').get(function () {
  return new Date() > this.expiresAt;
});

AlertSchema.virtual('isCurrentlyActive').get(function () {
  const now = new Date();
  return (
    this.status === 'active' &&
    this.isActive &&
    now >= this.effectiveFrom &&
    now <= this.expiresAt
  );
});

AlertSchema.virtual('timeRemaining').get(function () {
  if (this.isExpired) return 0;
  return Math.max(0, this.expiresAt - new Date());
});

AlertSchema.virtual('duration').get(function () {
  return this.expiresAt - this.effectiveFrom;
});

// Instance methods
AlertSchema.methods.activate = function () {
  this.status = 'active';
  this.isActive = true;
  this.lastUpdated = new Date();
  return this.save();
};

AlertSchema.methods.cancel = function (officialId, reason = '') {
  this.status = 'cancelled';
  this.isActive = false;
  this.lastUpdated = new Date();

  this.revisionHistory.push({
    revisedBy: officialId,
    changeType: 'cancellation',
    changeDescription: `Alert cancelled. Reason: ${reason}`,
    previousVersion: { status: this.status, isActive: this.isActive },
  });

  return this.save();
};

AlertSchema.methods.extend = function (officialId, newExpiryDate, reason = '') {
  const previousExpiry = this.expiresAt;
  this.expiresAt = newExpiryDate;
  this.lastUpdated = new Date();

  this.revisionHistory.push({
    revisedBy: officialId,
    changeType: 'time_extension',
    changeDescription: `Alert extended until ${newExpiryDate.toISOString()}. Reason: ${reason}`,
    previousVersion: { expiresAt: previousExpiry },
  });

  return this.save();
};

AlertSchema.methods.updateContent = function (
  officialId,
  updates,
  reason = ''
) {
  const previousVersion = {
    title: this.title,
    message: this.message,
    instructions: this.instructions,
    safetyTips: this.safetyTips,
  };

  Object.assign(this, updates);
  this.status = 'updated';
  this.lastUpdated = new Date();

  this.revisionHistory.push({
    revisedBy: officialId,
    changeType: 'content_update',
    changeDescription: `Alert content updated. ${reason}`,
    previousVersion,
  });

  return this.save();
};

AlertSchema.methods.incrementView = function () {
  this.metrics.viewCount += 1;
  return this.save();
};

AlertSchema.methods.incrementAcknowledgment = function () {
  this.metrics.acknowledgmentCount += 1;
  return this.save();
};

AlertSchema.methods.incrementShare = function () {
  this.metrics.shareCount += 1;
  return this.save();
};

// Static methods
AlertSchema.statics.findActiveInArea = function (
  longitude,
  latitude,
  radius = 10000
) {
  const now = new Date();
  return this.find({
    status: 'active',
    isActive: true,
    effectiveFrom: { $lte: now },
    expiresAt: { $gt: now },
    affectedArea: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      },
    },
  }).sort({ severity: -1, issuedAt: -1 });
};

AlertSchema.statics.findByHazardType = function (hazardType) {
  const now = new Date();
  return this.find({
    hazardType,
    status: 'active',
    isActive: true,
    effectiveFrom: { $lte: now },
    expiresAt: { $gt: now },
  }).sort({ severity: -1, issuedAt: -1 });
};

AlertSchema.statics.findExpiredAlerts = function () {
  const now = new Date();
  return this.find({
    status: 'active',
    expiresAt: { $lte: now },
    automaticExpiry: true,
  });
};

AlertSchema.statics.getActiveStatistics = async function () {
  const now = new Date();

  const stats = await this.aggregate([
    {
      $match: {
        status: 'active',
        isActive: true,
        effectiveFrom: { $lte: now },
        expiresAt: { $gt: now },
      },
    },
    {
      $group: {
        _id: {
          hazardType: '$hazardType',
          severity: '$severity',
        },
        count: { $sum: 1 },
        totalViews: { $sum: '$metrics.viewCount' },
        totalAcknowledgments: { $sum: '$metrics.acknowledgmentCount' },
      },
    },
  ]);

  return stats;
};

// Pre-save middleware
AlertSchema.pre('save', function (next) {
  // Auto-expire check
  if (
    this.automaticExpiry &&
    new Date() > this.expiresAt &&
    this.status === 'active'
  ) {
    this.status = 'expired';
    this.isActive = false;
  }

  // Update lastUpdated on any change
  if (this.isModified() && !this.isModified('metrics')) {
    this.lastUpdated = new Date();
  }

  next();
});

// Scheduled task to auto-expire alerts (called separately)
AlertSchema.statics.autoExpireAlerts = async function () {
  const expiredAlerts = await this.findExpiredAlerts();

  for (const alert of expiredAlerts) {
    alert.status = 'expired';
    alert.isActive = false;
    await alert.save();
  }

  return expiredAlerts.length;
};

// Ensure virtual fields are serialized
AlertSchema.set('toJSON', { virtuals: true });
AlertSchema.set('toObject', { virtuals: true });

const Alert = mongoose.models.Alert || mongoose.model('Alert', AlertSchema);

export default Alert;
