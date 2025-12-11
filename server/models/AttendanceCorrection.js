const mongoose = require('mongoose');

const attendanceCorrectionSchema = new mongoose.Schema({
  attendance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  requestType: {
    type: String,
    enum: ['check-in', 'check-out', 'both', 'forgot-checkout'],
    required: true
  },
  originalCheckIn: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number
    }
  },
  originalCheckOut: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number
    }
  },
  requestedCheckIn: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number
    },
    notes: String
  },
  requestedCheckOut: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number
    },
    notes: String
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  reviewedAt: Date,
  reviewNotes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to update timestamp
attendanceCorrectionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for performance
attendanceCorrectionSchema.index({ employee: 1, status: 1 });
attendanceCorrectionSchema.index({ organization: 1, status: 1, createdAt: -1 });
attendanceCorrectionSchema.index({ attendance: 1 });

module.exports = mongoose.model('AttendanceCorrection', attendanceCorrectionSchema);
