import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: false, // Made optional temporarily
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't return password in queries by default
    },
    role: {
      type: String,
      enum: ['citizen', 'official'],
      default: 'citizen',
    },
    officialId: {
      type: String,
      trim: true,
      default: null,
    },
    organization: {
      type: String,
      trim: true,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false, // Email/phone verification
    },
    isOfficialVerified: {
      type: Boolean,
      default: false, // Manual verification for officials
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },
    refreshTokens: [
      {
        token: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
          expires: 604800, // 7 days
        },
      },
    ],
    lastLogin: {
      type: Date,
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'te', 'hi'],
    },
    profession: {
      type: String,
      trim: true,
      enum: [
        'citizen',
        'tourist',
        'fisherman',
        'marine_officer',
        'coast_guard',
        'emergency_responder',
        'port_authority',
        'environmental_officer',
        'safety_inspector',
        'rescue_team',
        'other',
      ],
      default: 'citizen',
    },
    notificationPreferences: {
      push: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: true,
      },
      sms: {
        type: Boolean,
        default: false,
      },
      emergencyAlerts: {
        type: Boolean,
        default: true,
      },
      reportUpdates: {
        type: Boolean,
        default: true,
      },
      language: {
        type: String,
        enum: ['en', 'te', 'hi'],
        default: 'en',
      },
    },
    location: {
      latitude: Number,
      longitude: Number,
    },
    settings: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for account lock status
UserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcryptjs.genSalt(12);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
  console.log('🔑 comparePassword called:', {
    hasStoredPassword: !!this.password,
    candidatePasswordLength: candidatePassword?.length,
    storedPasswordLength: this.password?.length,
  });

  if (!this.password) {
    console.log('❌ No stored password found');
    return false;
  }

  try {
    const result = await bcryptjs.compare(candidatePassword, this.password);
    console.log('🔑 bcrypt compare result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error during password comparison:', error);
    return false;
  }
};

// Method to increment login attempts
UserSchema.methods.incLoginAttempts = function () {
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours

  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1, loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
UserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

// Method to generate verification token
UserSchema.methods.generateVerificationToken = function () {
  const crypto = require('crypto');

  // Generate a 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedToken = crypto.createHash('sha256').update(code).digest('hex');

  this.verificationToken = hashedToken;
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  return code; // Return the 6-digit code to send to user
};

// Method to generate password reset token
UserSchema.methods.generatePasswordResetToken = function () {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  this.passwordResetToken = hashedToken;
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

  return token; // Return unhashed token to send to user
};

// Static method to find user by credentials
UserSchema.statics.findByCredentials = async function (credential, password) {
  const isEmail = credential.includes('@');
  let query;

  if (isEmail) {
    query = { email: credential };
  } else {
    // For phone numbers, try multiple formats to handle normalization inconsistencies
    const cleanPhone = credential.replace(/[\s\-\(\)]/g, '');
    const phoneWithPlus = cleanPhone.startsWith('+')
      ? cleanPhone
      : `+${cleanPhone}`;
    const phoneWithoutPlus = cleanPhone.startsWith('+')
      ? cleanPhone.substring(1)
      : cleanPhone;

    query = {
      $or: [
        { phone: credential }, // Original format
        { phone: cleanPhone }, // Cleaned format
        { phone: phoneWithPlus }, // With + prefix
        { phone: phoneWithoutPlus }, // Without + prefix
      ],
    };
  }

  console.log('🔍 User.findByCredentials called with:', {
    credential,
    isEmail,
    query,
  });

  const user = await this.findOne(query).select(
    '+password +loginAttempts +lockUntil'
  );

  console.log('🔍 Database search result:', {
    found: !!user,
    userId: user?._id,
    userEmail: user?.email,
    userPhone: user?.phone,
    hasPassword: !!user?.password,
  });

  if (!user) {
    console.log('❌ No user found with query:', query);
    return null;
  }

  if (user.isLocked) {
    console.log('🔒 User account is locked:', user._id);
    await user.incLoginAttempts();
    throw new Error(
      'Account temporarily locked due to too many failed login attempts'
    );
  }

  console.log('🔑 Comparing password for user:', user._id);
  const isMatch = await user.comparePassword(password);
  console.log('🔑 Password comparison result:', { isMatch });

  if (!isMatch) {
    console.log('❌ Password mismatch for user:', user._id);
    await user.incLoginAttempts();
    return null;
  }

  if (user.loginAttempts > 0) {
    console.log('✅ Resetting login attempts for user:', user._id);
    await user.resetLoginAttempts();
  }

  console.log('✅ Login successful for user:', user._id);
  return user;
};

// Indexes for performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true }); // sparse allows multiple null values
UserSchema.index({ verificationToken: 1 });
UserSchema.index({ passwordResetToken: 1 });

// Prevent model re-compilation during development
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;
