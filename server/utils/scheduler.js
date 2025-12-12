// scheduler.js
const cron = require('node-cron');
const moment = require('moment-timezone'); // npm i moment-timezone
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Organization = require('../models/Organization');
const Holiday = require('../models/holidayModel');
const { default: sendPushNotification } = require('./sendNotification');
const { default: ExpoToken } = require('../models/ExpoToken');
const timers = new Map(); // orgId -> timeoutId

// Utility: parse "HH:mm" into {hour, minute}
function parseTimeHM(hm) {
  const [hourStr, minuteStr] = hm.split(':');
  return { hour: Number(hourStr), minute: Number(minuteStr) };
}

// Check if a date is a holiday for an organization
async function isHoliday(organizationId, date) {
  try {
    // Create start and end of the day for the given date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Check if there's a holiday for this organization on this date
    const holiday = await Holiday.findOne({
      organizationId: organizationId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    return !!holiday;
  } catch (error) {
    console.error(`Error checking holiday for org ${organizationId} on ${date}:`, error);
    // On error, return false to allow scheduling (fail-safe)
    return false;
  }
}

// Compute Date object in system timezone for the org's start time on the given date
function computeOrgStartDate(org, dateMoment) {
  // dateMoment is a moment object in org.timezone set to the desired day
  const { hour, minute } = parseTimeHM(org.settings.workingHours.start);
  const startInOrgTz = dateMoment.clone().hour(hour).minute(minute).second(0).millisecond(0);
  // Convert to JS Date in server local time (moment's toDate considers zone)
  return startInOrgTz.toDate();
}

// The function that checks logged-in employees and notifies if not logged in
async function checkEmployeesAndNotify(org) {
  try {
    console.log(`[${new Date().toISOString()}] Running check for org ${org.id} (${org.name})`);
    // Get all employees of the org
    const employees = await Employee.find({ organization: org.id, status: 'active' });
    // Note: Attendance date matching: adjust according to how you store 'date' (here we use yyyy-mm-dd midnight)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    const attendance = await Attendance.find({
      organization: org.id,
      date: { $gte: todayStart, $lt: tomorrowStart }
    });

    const notLoggedIn = employees.filter(e => !attendance.some(a => a.employee.toString() === e.id.toString()));

    for (const e of notLoggedIn) {
      // Prepare message (use settings value for clarity)
      const startTime = org.settings?.workingHours?.start || 'start time';
      const message = `Hi ${e.name || ''}, it looks like you haven't checked in for today's shift at ${startTime}. Please check in.`;
      // Send notification - implement as push/email/SMS
      const token = await ExpoToken.findOne({ userId: e.id });
      if (token) {
        await sendPushNotification(token.token, { title: 'Attendance Reminder', body: message });
      }
    }

    console.log(`Check finished for org ${org.id}: ${notLoggedIn.length} notified.`);
  } catch (err) {
    console.error(`Error during check for org ${org.id}:`, err);
  }
}

// Schedule a one-time job for org at startDate (JS Date)
function scheduleOneTimeOrgCheck(org, startDate) {
  const now = new Date();
  const delay = startDate.getTime() - now.getTime();
  if (delay <= 0) {
    console.log(`start time already passed for org ${org.id}, skipping schedule.`);
    return;
  }

  // clear previous timer if exists
  if (timers.has(org.id)) {
    clearTimeout(timers.get(org.id));
    timers.delete(org.id);
  }

  const timeoutId = setTimeout(() => {
    // run check
    checkEmployeesAndNotify(org).catch(console.error);
    // cleanup
    timers.delete(org.id);
  }, delay);

  timers.set(org.id, timeoutId);
  console.log(`Scheduled check for org ${org.id} at ${startDate.toString()}`);
}


// ---------------------------------------------------------
// Cancel / delete timer for an organization
// - Use when org is deleted, disabled, or you want to stop scheduled check
// ---------------------------------------------------------
function cancelOrgTimer(orgId) {
  if (timers.has(orgId)) {
    try {
      clearTimeout(timers.get(orgId));
    } catch (e) {
      // ignore errors from clearTimeout
    }
    timers.delete(orgId);
    console.log(`Cancelled timer for org ${orgId}`);
  } else {
    console.log(`No active timer to cancel for org ${orgId}`);
  }
}


// ---------------------------------------------------------
// Reschedule an organization
// - Accepts either: org object OR orgId (string)
// - Steps:
//    1) cancel existing timer for the org
//    2) if today is a working day, compute today's start time and schedule if in future
//    3) if start already passed, does not schedule (you can modify to trigger immediate check)
// ---------------------------------------------------------
async function rescheduleOrg(orgOrId) {
  let org;
  // Accept either org object or id
  if (typeof orgOrId === 'string' || typeof orgOrId === 'number') {
    org = await Organization.findById(orgOrId);
    if (!org) {
      console.warn(`rescheduleOrg: organization not found for id ${orgOrId}`);
      return;
    }
  } else {
    org = orgOrId;
  }

  // Cancel existing timer
  cancelOrgTimer(org.id);

  // If org is inactive, no scheduling
  if (org.isActive === false) {
    console.log(`Org ${org.id} is inactive; not scheduling.`);
    return;
  }

  // Check if today is a working day in org timezone
  const tz = org.settings?.timezone || 'UTC';
  const orgNow = moment.tz(tz);
  const weekday = orgNow.day();

  if (!Array.isArray(org.settings?.workingDays) || !org.settings.workingDays.includes(weekday)) {
    console.log(`Org ${org.id} not working today (weekday ${weekday}); no schedule created.`);
    return;
  }

  // Check if today is a holiday
  const todayDate = orgNow.toDate();
  const isTodayHoliday = await isHoliday(org.id, todayDate);
  if (isTodayHoliday) {
    console.log(`Org ${org.id} has a holiday today; no schedule created.`);
    return;
  }

  // Compute start date/time for today
  const startDate = computeOrgStartDate(org, orgNow);
  const now = new Date();

  if (startDate.getTime() > now.getTime()) {
    scheduleOneTimeOrgCheck(org, startDate);
    console.log(`Rescheduled org ${org.id} for today at ${startDate.toISOString()}`);
  } else {
    console.log(`Reschedule: start time for org ${org.id} already passed today.`);
    // Optional behavior:
    // - Run check immediately if start time recently passed:
    // await checkEmployeesAndNotify(org);
    // - Or compute next working day and schedule for that day.
  }
}


// This will fetch all orgs and schedule today's checks for working days
async function scheduleTodaysChecks() {
  console.log(`[${new Date().toISOString()}] scheduleTodaysChecks() started`);
  const orgs = await Organization.find({ isActive: true });

  for (const org of orgs) {
    try {
      const tz = org.settings.timezone || 'UTC';
      // current date in org timezone
      const orgNow = moment.tz(tz);
      const weekday = orgNow.day(); // 0..6

      // if today is a working day (org.settings.workingDays contains weekday)
      if (Array.isArray(org.settings.workingDays) && org.settings.workingDays.includes(weekday)) {
        // Check if today is a holiday
        const todayDate = orgNow.toDate();
        const isTodayHoliday = await isHoliday(org.id, todayDate);
        if (isTodayHoliday) {
          console.log(`Org ${org.id}(${org.name}) has a holiday today; skipping scheduling.`);
          continue;
        }

        // Compute start datetime for today in org tz
        const startDate = computeOrgStartDate(org, orgNow);

        // If startDate is in future (from server perspective), schedule
        const now = new Date();
        if (startDate.getTime() > now.getTime()) {
          scheduleOneTimeOrgCheck(org, startDate);
        } else {
          // optionally, if start time passed but very recently, you can still run immediate check
          console.log(`Org ${org.id} start time already passed for today (start=${startDate}), skipping scheduling.`);
        }
      } else {
        console.log(`Org ${org.id}(${org.name}) is not working today (weekday ${weekday})`);
      }
    } catch (err) {
      console.error(`Error scheduling for org ${org.id}:`, err);
    }
  }

  console.log(`[${new Date().toISOString()}] scheduleTodaysChecks() done`);
}

// On app start: call scheduleTodaysChecks to recover after restart
async function initScheduler() {
  // Recreate today's pending timers
  await scheduleTodaysChecks();

  // Schedule the daily midnight job (00:00 server time). If you want midnight in a specific tz, provide cron options.
  // Using node-cron: '0 0 * * *' runs at 00:00 server local time every day
  cron.schedule('0 0 * * *', async () => {
    console.log(`[${new Date().toISOString()}] Midnight cron triggered`);
    // clear any remaining timers from previous day to be safe
    for (const [orgId, t] of timers.entries()) {
      clearTimeout(t);
    }
    timers.clear();
    await scheduleTodaysChecks();
  }, {
    scheduled: true
    // If you want cron to use a timezone: timezone: 'Asia/Kolkata'
  });

  console.log('Scheduler initialized.');
}

module.exports = {
  initScheduler,
  scheduleTodaysChecks,
  scheduleOneTimeOrgCheck,
  // newly exported functions:
  rescheduleOrg,
  cancelOrgTimer
};
