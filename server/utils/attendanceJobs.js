const cron = require('node-cron');
const moment = require('moment-timezone');
const Attendance = require('../models/Attendance');
const Organization = require('../models/Organization');
const AttendanceCorrection = require('../models/AttendanceCorrection');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');

/**
 * Auto-complete forgotten checkouts at end of day
 * Runs every day at 11:59 PM
 */
const autoCompleteCheckouts = cron.schedule('59 23 * * *', async () => {
  try {
    console.log('🤖 Running auto-complete checkout job...');

    // Get all organizations
    const organizations = await Organization.find({ isActive: true });

    for (const org of organizations) {
      const timezone = org.settings?.timezone || 'UTC';
      const today = moment().tz(timezone).startOf('day').toDate();
      const endOfDay = moment().tz(timezone).endOf('day').toDate();

      // Find all attendances with check-in but no check-out for today
      const incompleteAttendances = await Attendance.find({
        organization: org._id,
        date: today,
        'checkIn.time': { $exists: true },
        'checkOut.time': { $exists: false }
      }).populate('employee', 'name email');

      console.log(`📋 Found ${incompleteAttendances.length} incomplete attendances for ${org.name}`);

      for (const attendance of incompleteAttendances) {
        // Create auto-correction record for audit trail
        const correction = new AttendanceCorrection({
          attendance: attendance._id,
          employee: attendance.employee._id,
          organization: org._id,
          requestType: 'forgot-checkout',
          originalCheckIn: attendance.checkIn,
          requestedCheckOut: {
            time: endOfDay,
            notes: 'Auto-completed by system (forgot to checkout)'
          },
          reason: 'System auto-completed - Employee forgot to checkout',
          status: 'approved',
          reviewedBy: org._id,
          reviewedAt: new Date(),
          reviewNotes: 'Automatically approved by system'
        });

        await correction.save();

        // Update attendance with auto-checkout at end of day
        attendance.checkOut = {
          time: endOfDay,
          location: attendance.checkIn.location, // Use same location as check-in
          notes: 'Auto-completed by system (forgot to checkout)'
        };

        await attendance.save();

        // Log in audit trail
        await auditService.logAutoCompleteCheckout(attendance, attendance.employee, org._id);

        // Notify employee
        await notificationService.sendForgotCheckoutNotification(attendance.employee, attendance);

        console.log(`✅ Auto-completed checkout for ${attendance.employee.name}`);
      }
    }

    console.log('✅ Auto-complete checkout job completed');
  } catch (error) {
    console.error('❌ Error in auto-complete checkout job:', error);
  }
}, {
  scheduled: false, // Don't start automatically
  timezone: 'UTC'
});

/**
 * Send reminders for incomplete checkouts
 * Runs every day at 6:00 PM
 */
const sendCheckoutReminders = cron.schedule('0 18 * * *', async () => {
  try {
    console.log('🔔 Running checkout reminder job...');

    const organizations = await Organization.find({ isActive: true });

    for (const org of organizations) {
      const timezone = org.settings?.timezone || 'UTC';
      const today = moment().tz(timezone).startOf('day').toDate();

      // Find all attendances with check-in but no check-out for today
      const incompleteAttendances = await Attendance.find({
        organization: org._id,
        date: today,
        'checkIn.time': { $exists: true },
        'checkOut.time': { $exists: false }
      }).populate('employee', 'name email');

      console.log(`📋 Found ${incompleteAttendances.length} employees to remind for ${org.name}`);

      // Send reminder notifications
      for (const attendance of incompleteAttendances) {
        await notificationService.sendCheckoutReminder(attendance.employee, attendance);
        console.log(`🔔 Reminder sent: ${attendance.employee.name} (${attendance.employee.email}) needs to checkout`);
      }
    }

    console.log('✅ Checkout reminder job completed');
  } catch (error) {
    console.error('❌ Error in checkout reminder job:', error);
  }
}, {
  scheduled: false,
  timezone: 'UTC'
});

/**
 * Start all attendance jobs
 */
const startAttendanceJobs = () => {
  console.log('🚀 Starting attendance jobs...');
  autoCompleteCheckouts.start();
  sendCheckoutReminders.start();
  console.log('✅ Attendance jobs started');
};

/**
 * Stop all attendance jobs
 */
const stopAttendanceJobs = () => {
  console.log('🛑 Stopping attendance jobs...');
  autoCompleteCheckouts.stop();
  sendCheckoutReminders.stop();
  console.log('✅ Attendance jobs stopped');
};

module.exports = {
  startAttendanceJobs,
  stopAttendanceJobs,
  autoCompleteCheckouts,
  sendCheckoutReminders
};
