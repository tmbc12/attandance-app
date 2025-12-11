const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  tokenHash: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'accepted', 'expired', 'revoked'],
    default: 'sent'
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  revokedAt: {
    type: Date,
    default: null
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  ip: {
    type: String,
    required: true
  },
  userAgent: String,
  deviceInfo: {
    type: String,
    default: null
  },
  resendCount: {
    type: Number,
    default: 0
  },
  lastResendAt: Date
});

// Indexes
inviteSchema.index({ employeeId: 1 });
inviteSchema.index({ email: 1 });
inviteSchema.index({ tokenHash: 1 });
inviteSchema.index({ status: 1 });
inviteSchema.index({ sentAt: 1 });
inviteSchema.index({ invitedBy: 1 });

module.exports = mongoose.model('Invite', inviteSchema);



