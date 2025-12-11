const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: true
  },
  checkIn: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number
    },
    notes: String
  },
  checkOut: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number
    },
    notes: String
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'halfday', 'leave'],
    default: 'present'
  },
  workingHours: {
    type: Number,
    default: 0
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateBy: {
    type: Number, // minutes
    default: 0
  },
  overtime: {
    type: Number, // minutes
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to update timestamp and calculate working hours
attendanceSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // Calculate working hours if both check-in and check-out exist
  if (this.checkIn?.time && this.checkOut?.time) {
    const checkInTime = new Date(this.checkIn.time);
    const checkOutTime = new Date(this.checkOut.time);
    const diffMs = checkOutTime - checkInTime;
    this.workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // hours with 2 decimals
  }

  next();
});

// Indexes for performance
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ organization: 1, date: 1 });
attendanceSchema.index({ employee: 1, createdAt: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
