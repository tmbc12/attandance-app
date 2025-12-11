const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry
 */
const createAuditLog = async ({
  organizationId,
  entityType,
  entityId,
  action,
  performedBy,
  performedByModel,
  changes = {},
  metadata = {},
  description,
  ipAddress = null,
  userAgent = null
}) => {
  try {
    const auditLog = new AuditLog({
      organization: organizationId,
      entityType,
      entityId,
      action,
      performedBy,
      performedByModel,
      changes,
      metadata,
      description,
      ipAddress,
      userAgent
    });

    await auditLog.save();
    console.log(`📝 Audit log created: ${action} on ${entityType}:${entityId}`);
    return auditLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error - auditing should not break the main flow
    return null;
  }
};

/**
 * Log attendance creation
 */
const logAttendanceCreate = async (attendance, employee) => {
  return createAuditLog({
    organizationId: attendance.organization,
    entityType: 'Attendance',
    entityId: attendance._id,
    action: 'create',
    performedBy: employee._id,
    performedByModel: 'Employee',
    changes: {
      after: attendance.toObject()
    },
    description: `${employee.name} checked in`,
    metadata: {
      checkInTime: attendance.checkIn?.time,
      isLate: attendance.isLate,
      lateBy: attendance.lateBy
    }
  });
};

/**
 * Log attendance update (checkout)
 */
const logAttendanceUpdate = async (attendance, employee, before) => {
  return createAuditLog({
    organizationId: attendance.organization,
    entityType: 'Attendance',
    entityId: attendance._id,
    action: 'update',
    performedBy: employee._id,
    performedByModel: 'Employee',
    changes: {
      before: before,
      after: attendance.toObject()
    },
    description: `${employee.name} checked out`,
    metadata: {
      checkOutTime: attendance.checkOut?.time,
      workingHours: attendance.workingHours,
      overtime: attendance.overtime
    }
  });
};

/**
 * Log auto-completed checkout
 */
const logAutoCompleteCheckout = async (attendance, employee, organizationId) => {
  return createAuditLog({
    organizationId: organizationId,
    entityType: 'Attendance',
    entityId: attendance._id,
    action: 'auto_complete',
    performedBy: organizationId, // System action attributed to organization
    performedByModel: 'Organization',
    changes: {
      before: { checkOut: null },
      after: { checkOut: attendance.checkOut }
    },
    description: `System auto-completed checkout for ${employee.name} (forgot to checkout)`,
    metadata: {
      autoCheckOutTime: attendance.checkOut?.time,
      reason: 'forgot_checkout'
    }
  });
};

/**
 * Log correction request creation
 */
const logCorrectionRequest = async (correction, employee) => {
  return createAuditLog({
    organizationId: correction.organization,
    entityType: 'AttendanceCorrection',
    entityId: correction._id,
    action: 'correction_request',
    performedBy: employee._id,
    performedByModel: 'Employee',
    changes: {
      after: correction.toObject()
    },
    description: `${employee.name} requested attendance correction`,
    metadata: {
      requestType: correction.requestType,
      reason: correction.reason,
      attendanceId: correction.attendance
    }
  });
};

/**
 * Log correction approval
 */
const logCorrectionApprove = async (correction, admin, employee, attendanceBefore, attendanceAfter) => {
  return createAuditLog({
    organizationId: correction.organization,
    entityType: 'AttendanceCorrection',
    entityId: correction._id,
    action: 'correction_approve',
    performedBy: admin._id,
    performedByModel: 'Organization',
    changes: {
      before: attendanceBefore,
      after: attendanceAfter
    },
    description: `Admin approved correction request from ${employee.name}`,
    metadata: {
      correctionId: correction._id,
      attendanceId: correction.attendance,
      requestType: correction.requestType,
      reviewNotes: correction.reviewNotes
    }
  });
};

/**
 * Log correction rejection
 */
const logCorrectionReject = async (correction, admin, employee) => {
  return createAuditLog({
    organizationId: correction.organization,
    entityType: 'AttendanceCorrection',
    entityId: correction._id,
    action: 'correction_reject',
    performedBy: admin._id,
    performedByModel: 'Organization',
    description: `Admin rejected correction request from ${employee.name}`,
    metadata: {
      correctionId: correction._id,
      attendanceId: correction.attendance,
      requestType: correction.requestType,
      reviewNotes: correction.reviewNotes,
      reason: correction.reason
    }
  });
};

/**
 * Get audit logs with filters
 */
const getAuditLogs = async (filters = {}, limit = 50, skip = 0) => {
  const query = {};

  if (filters.organizationId) {
    query.organization = filters.organizationId;
  }

  if (filters.entityType) {
    query.entityType = filters.entityType;
  }

  if (filters.entityId) {
    query.entityId = filters.entityId;
  }

  if (filters.action) {
    query.action = filters.action;
  }

  if (filters.performedBy) {
    query.performedBy = filters.performedBy;
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }
  }

  const logs = await AuditLog.find(query)
    .populate('performedBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await AuditLog.countDocuments(query);

  return {
    logs,
    total,
    hasMore: skip + logs.length < total
  };
};

/**
 * Get audit logs for an attendance record
 */
const getAttendanceAuditLogs = async (attendanceId, organizationId) => {
  return getAuditLogs({
    entityType: 'Attendance',
    entityId: attendanceId,
    organizationId
  });
};

/**
 * Get audit logs for an employee
 */
const getEmployeeAuditLogs = async (employeeId, organizationId, limit = 50, skip = 0) => {
  return getAuditLogs({
    performedBy: employeeId,
    organizationId
  }, limit, skip);
};

/**
 * Delete old audit logs (older than 1 year)
 */
const cleanupOldAuditLogs = async () => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const result = await AuditLog.deleteMany({
    createdAt: { $lt: oneYearAgo }
  });

  console.log(`🧹 Cleaned up ${result.deletedCount} old audit logs`);
  return result;
};

module.exports = {
  createAuditLog,
  logAttendanceCreate,
  logAttendanceUpdate,
  logAutoCompleteCheckout,
  logCorrectionRequest,
  logCorrectionApprove,
  logCorrectionReject,
  getAuditLogs,
  getAttendanceAuditLogs,
  getEmployeeAuditLogs,
  cleanupOldAuditLogs
};
