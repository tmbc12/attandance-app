const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const organizationSchema = new mongoose.Schema({
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
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'hr_manager'],
    default: 'admin'
  },
  permissions: [{
    type: String,
    enum: [
      'manage_employees',
      'manage_invites',
      'view_reports',
      'manage_settings',
      'bulk_operations'
    ]
  }],
  settings: {
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' }
    },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5] // Monday to Friday
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    lateCheckInBuffer: {
      type: Number,
      default: 60 // minutes
    },
    attendanceCloseEnabled: {
      type: Boolean,
      default: false
    },
    attendanceCloseTime: {
      type: String,
      default: '10:00' // Default closing time
    },
    // Automatic Check-in Settings
    autoCheckInWindow: {
      type: Number,
      default: 90 // minutes before work start time (e.g., 90 mins = check-in window from 7:30-9:00 for 9:00 AM start)
    },
    // Company Location for GPS-based check-in
    companyLocation: {
      enabled: { type: Boolean, default: false },
      latitude: { type: Number },
      longitude: { type: Number },
      radius: { type: Number, default: 200 }, // meters
      address: { type: String }
    },
    // Company WiFi for WiFi-based check-in
    companyWifi: {
      enabled: { type: Boolean, default: false },
      networks: [{
        ssid: { type: String },
        bssid: { type: String }, // MAC address of WiFi router
        name: { type: String } // Friendly name
      }]
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to hash password and update timestamp
organizationSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  this.updatedAt = new Date();
  next();
});

// Method to compare password
organizationSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes
organizationSchema.index({ isActive: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
