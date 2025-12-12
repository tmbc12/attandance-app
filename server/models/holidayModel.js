const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
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

// Pre-save middleware to update timestamp
holidaySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for performance
holidaySchema.index({ organizationId: 1, date: 1 }, { unique: true });
holidaySchema.index({ organizationId: 1 });
holidaySchema.index({ date: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);

