const Notification = require('../models/Notification');

/**
 * Create a notification
 */
const createNotification = async ({
  recipientId,
  recipientModel,
  organizationId,
  type,
  title,
  message,
  data = {}
}) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      recipientModel,
      organization: organizationId,
      type,
      title,
      message,
      data
    });

    await notification.save();
    console.log(`✅ Notification created: ${type} for ${recipientModel}:${recipientId}`);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Send checkout reminder notification
 */
const sendCheckoutReminder = async (employee, attendance) => {
  return createNotification({
    recipientId: employee._id,
    recipientModel: 'Employee',
    organizationId: employee.organization,
    type: 'checkout_reminder',
    title: 'Remember to Check Out',
    message: 'Don\'t forget to check out at the end of your workday.',
    data: {
      attendanceId: attendance._id,
      checkInTime: attendance.checkIn.time
    }
  });
};

/**
 * Send forgot checkout notification
 */
const sendForgotCheckoutNotification = async (employee, attendance) => {
  return createNotification({
    recipientId: employee._id,
    recipientModel: 'Employee',
    organizationId: employee.organization,
    type: 'forgot_checkout',
    title: 'Missed Check-Out',
    message: 'You forgot to check out yesterday. Your attendance has been auto-completed. If this is incorrect, please submit a correction request.',
    data: {
      attendanceId: attendance._id,
      date: attendance.date,
      checkInTime: attendance.checkIn.time,
      autoCheckOutTime: attendance.checkOut.time
    }
  });
};

/**
 * Send correction requested notification to admin
 */
const sendCorrectionRequestedNotification = async (organizationId, employee, correction) => {
  return createNotification({
    recipientId: organizationId,
    recipientModel: 'Organization',
    organizationId: organizationId,
    type: 'correction_requested',
    title: 'New Attendance Correction Request',
    message: `${employee.name} has requested an attendance correction.`,
    data: {
      correctionId: correction._id,
      employeeId: employee._id,
      employeeName: employee.name,
      requestType: correction.requestType,
      reason: correction.reason
    }
  });
};

/**
 * Send correction approved notification to employee
 */
const sendCorrectionApprovedNotification = async (employee, correction) => {
  return createNotification({
    recipientId: employee._id,
    recipientModel: 'Employee',
    organizationId: employee.organization,
    type: 'correction_approved',
    title: 'Correction Request Approved',
    message: 'Your attendance correction request has been approved.',
    data: {
      correctionId: correction._id,
      attendanceId: correction.attendance,
      reviewNotes: correction.reviewNotes
    }
  });
};

/**
 * Send correction rejected notification to employee
 */
const sendCorrectionRejectedNotification = async (employee, correction) => {
  return createNotification({
    recipientId: employee._id,
    recipientModel: 'Employee',
    organizationId: employee.organization,
    type: 'correction_rejected',
    title: 'Correction Request Rejected',
    message: `Your attendance correction request has been rejected. Reason: ${correction.reviewNotes}`,
    data: {
      correctionId: correction._id,
      attendanceId: correction.attendance,
      reviewNotes: correction.reviewNotes
    }
  });
};

/**
 * Send late arrival notification
 */
const sendLateArrivalNotification = async (employee, attendance, lateBy) => {
  const hours = Math.floor(lateBy / 60);
  const minutes = lateBy % 60;
  const lateText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return createNotification({
    recipientId: employee._id,
    recipientModel: 'Employee',
    organizationId: employee.organization,
    type: 'late_arrival',
    title: 'Late Check-In',
    message: `You checked in ${lateText} late today.`,
    data: {
      attendanceId: attendance._id,
      lateBy,
      checkInTime: attendance.checkIn.time
    }
  });
};

/**
 * Get notifications for a user
 */
const getNotifications = async (recipientId, recipientModel, limit = 20, skip = 0, unreadOnly = false) => {
  const query = {
    recipient: recipientId,
    recipientModel
  };

  if (unreadOnly) {
    query.read = false;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({
    recipient: recipientId,
    recipientModel,
    read: false
  });

  return {
    notifications,
    total,
    unreadCount,
    hasMore: skip + notifications.length < total
  };
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, recipientId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: recipientId
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  notification.read = true;
  notification.readAt = new Date();
  await notification.save();

  return notification;
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (recipientId, recipientModel) => {
  const result = await Notification.updateMany(
    {
      recipient: recipientId,
      recipientModel,
      read: false
    },
    {
      $set: {
        read: true,
        readAt: new Date()
      }
    }
  );

  return result;
};

/**
 * Delete old notifications (older than 30 days)
 */
const cleanupOldNotifications = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await Notification.deleteMany({
    createdAt: { $lt: thirtyDaysAgo },
    read: true
  });

  console.log(`🧹 Cleaned up ${result.deletedCount} old notifications`);
  return result;
};

module.exports = {
  createNotification,
  sendCheckoutReminder,
  sendForgotCheckoutNotification,
  sendCorrectionRequestedNotification,
  sendCorrectionApprovedNotification,
  sendCorrectionRejectedNotification,
  sendLateArrivalNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  cleanupOldNotifications
};
