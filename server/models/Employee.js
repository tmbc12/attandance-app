const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const invitationSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['draft', 'invited', 'accepted', 'expired', 'revoked'],
    default: 'draft'
  },
  tokenHash: {
    type: String,
    required: function() {
      return this.status === 'invited' || this.status === 'accepted';
    }
  },
  expiresAt: {
    type: Date,
    required: function() {
      return this.status === 'invited';
    }
  },
  sentAt: {
    type: Date,
    default: null
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
});

const employeeSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  employeeId: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  designation: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['employee', 'manager', 'admin','tl'],
    default: 'employee'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'suspended'],
    default: 'pending'
  },
  password: {
    type: String,
    required: function() {
      return this.status === 'active';
    }
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    default: null
  },
  invitation: invitationSchema,
  profile: {
    phone: String,
    dateOfBirth: Date,
    profilePhoto: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    timezone: { type: String, default: 'UTC' },
    language: { type: String, default: 'en' },
    // Attendance Mode Preferences
    attendanceMode: {
      type: String,
      enum: ['manual', 'gps', 'wifi', 'both'], // manual = traditional check-in, both = GPS or WiFi
      default: 'manual'
    },
    autoCheckInEnabled: {
      type: Boolean,
      default: false
    }
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  otpCode: {
    type: String,
    default: null
  },
  otpCodeExpiresAt: {
    type: Date,
    default: null
  },
  otpCodeVerified: {
    type: Boolean,
    default: false
  }
});

// Pre-save middleware to update timestamp
employeeSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

// Pre-save middleware to hash password
employeeSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Method to compare password
employeeSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if invitation is expired
employeeSchema.methods.isInvitationExpired = function() {
  if (!this.invitation || !this.invitation.expiresAt) return false;
  return new Date() > this.invitation.expiresAt;
};

// Method to check if invitation is valid
employeeSchema.methods.isInvitationValid = function() {
  return this.invitation && 
         this.invitation.status === 'invited' && 
         !this.isInvitationExpired();
};

// Indexes
employeeSchema.index({ 'invitation.tokenHash': 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ department: 1 });

module.exports = mongoose.model('Employee', employeeSchema);



