const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  colorCode: {
    type: String,
    trim: true
  },  
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  isActive: {
    type: Boolean,
    default: true
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
departmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes
departmentSchema.index({ organization: 1, name: 1 }, { unique: true });
departmentSchema.index({ isActive: 1 });

module.exports = mongoose.model('Department', departmentSchema);
