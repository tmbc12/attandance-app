const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  entityType: {
    type: String,
    enum: ['Attendance', 'AttendanceCorrection', 'Employee', 'Organization'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  action: {
    type: String,
    enum: [
      'create',
      'update',
      'delete',
      'approve',
      'reject',
      'auto_complete',
      'correction_request',
      'correction_approve',
      'correction_reject'
    ],
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'performedByModel',
    required: true
  },
  performedByModel: {
    type: String,
    required: true,
    enum: ['Employee', 'Organization', 'System']
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  description: {
    type: String,
    required: true
  },
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
auditLogSchema.index({ organization: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
