const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Organization = require('../models/Organization');
const { auth } = require('../middleware/auth');
const moment = require('moment-timezone');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');

// Helper function to format minutes into hours and minutes
const formatLateTime = (minutes) => {
  if (minutes === 0) return '0 minutes';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  } else if (mins === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  } else {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  }
};

// Employee authentication middleware (separate from admin auth)
const employeeAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    // JWT payload uses 'userId' (from auth.js line 87)
    const employee = await Employee.findById(decoded.userId).select('-password');

    if (!employee || employee.status !== 'active') {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.employee = employee;
    next();
  } catch (error) {
    console.error('Employee auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Check-in
router.post('/check-in', employeeAuth, async (req, res) => {
  try {
    const { location, notes } = req.body;
    const employee = req.employee;
    console.log(employee)

    // Validate employee has organization
    if (!employee.organization) {
      return res.status(400).json({
        message: 'Employee is not assigned to any organization. Please contact your administrator.'
      });
    }

      // Get organization settings for timezone
    const organization = await Organization.findById(employee.organization);

    if (!organization) {
      return res.status(400).json({
        message: 'Organization not found. Please contact your administrator.'
      });
    }

    const timezone = organization.settings?.timezone || 'UTC';

    // Get current date in organization's timezone
    const now = moment().tz(timezone);
    const today = moment().tz(timezone).startOf('day').toDate(); // Use a separate moment instance

    console.log('⏰ Check-in time info:', {
      timezone,
      now: now.format('YYYY-MM-DD HH:mm:ss'),
      today: today,
      nowDate: now.toDate()
    });

    // Check if attendance is closed for the day
    if (organization.settings?.attendanceCloseEnabled) {
      const closeTime = organization.settings.attendanceCloseTime; // e.g., "10:00"
      const [closeHour, closeMinute] = closeTime.split(':').map(Number);
      const closeDateTime = moment().tz(timezone).set({
        hour: closeHour,
        minute: closeMinute,
        second: 0
      });

      if (now.isAfter(closeDateTime)) {
        return res.status(400).json({
          message: `Attendance is closed for today. Check-in not allowed after ${moment(closeDateTime).format('hh:mm A')}`,
          closingTime: moment(closeDateTime).format('hh:mm A')
        });
      }
    }

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employee: employee._id,
      organization: employee.organization,
      date: today
    });

    if (existingAttendance && existingAttendance.checkIn && existingAttendance.checkIn.time) {
      return res.status(400).json({
        message: 'You have already checked in today',
        checkInTime: moment(existingAttendance.checkIn.time).format('hh:mm A'),
        attendance: existingAttendance
      });
    }

    // Check if late (with grace period)
    const workingHoursStart = organization.settings.workingHours.start; // "09:00"
    const [startHour, startMinute] = workingHoursStart.split(':').map(Number);
    const expectedCheckIn = moment().tz(timezone).set({
      hour: startHour,
      minute: startMinute,
      second: 0
    });

    // Add grace period buffer (default 15 minutes)
    const graceBuffer = organization.settings.lateCheckInBuffer || 15; // minutes
    const graceCheckIn = expectedCheckIn.clone().add(graceBuffer, 'minutes');

    // Calculate if late and by how much
    let isLate = false;
    let lateBy = 0;
    let isWithinGracePeriod = false;

    if (now.isAfter(expectedCheckIn)) {
      const minutesLate = now.diff(expectedCheckIn, 'minutes');

      if (minutesLate <= graceBuffer) {
        // Within grace period - not counted as late
        isWithinGracePeriod = true;
        isLate = false;
        lateBy = 0;
      } else {
        // Beyond grace period - counted as late
        isLate = true;
        lateBy = minutesLate; // Total minutes after expected time
      }
    }

    // Create or update attendance
    let attendance;
    if (existingAttendance) {
      existingAttendance.checkIn = {
        time: now.toDate(),
        location,
        notes
      };
      existingAttendance.isLate = isLate;
      existingAttendance.lateBy = lateBy;
      existingAttendance.status = isLate ? 'late' : 'present';
      attendance = await existingAttendance.save();
    } else {
      attendance = new Attendance({
        employee: employee._id,
        organization: employee.organization,
        date: today,
        checkIn: {
          time: now.toDate(),
          location,
          notes
        },
        isLate,
        lateBy,
        status: isLate ? 'late' : 'present'
      });
      await attendance.save();
    }

    // Log attendance creation in audit trail
    await auditService.logAttendanceCreate(attendance, employee);

    // Send notification if late (beyond grace period)
    if (isLate) {
      await notificationService.sendLateArrivalNotification(employee, attendance, lateBy);
    }

    res.json({
      message: 'Checked in successfully',
      attendance: {
        ...attendance.toObject(),
        checkInTime: moment(attendance.checkIn.time).tz(timezone).format('hh:mm A'), // 12-hour format
        lateByFormatted: isLate ? formatLateTime(lateBy) : null
      },
      isLate,
      lateBy: isLate ? lateBy : 0,
      lateByFormatted: isLate ? formatLateTime(lateBy) : null,
      isWithinGracePeriod,
      gracePeriodMinutes: graceBuffer
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Error during check-in', error: error.message });
  }
});

// Check-out
router.post('/check-out', employeeAuth, async (req, res) => {
  try {
    const { location, notes } = req.body;
    const employee = req.employee;

    // Validate employee has organization
    if (!employee.organization) {
      return res.status(400).json({
        message: 'Employee is not assigned to any organization. Please contact your administrator.'
      });
    }

    // Get organization settings for timezone
    const organization = await Organization.findById(employee.organization);

    if (!organization) {
      return res.status(400).json({
        message: 'Organization not found. Please contact your administrator.'
      });
    }

    const timezone = organization.settings?.timezone || 'UTC';
    const now = moment().tz(timezone);
    const today = moment().tz(timezone).startOf('day').toDate(); // Use a separate moment instance

    console.log('⏰ Check-out time info:', {
      timezone,
      now: now.format('YYYY-MM-DD HH:mm:ss'),
      today: today,
      nowDate: now.toDate()
    });

    // Find today's attendance
    const attendance = await Attendance.findOne({
      employee: employee._id,
      organization: employee.organization,
      date: today
    });

    if (!attendance || !attendance.checkIn || !attendance.checkIn.time) {
      return res.status(400).json({
        message: 'You must check in before checking out'
      });
    }

    if (attendance.checkOut && attendance.checkOut.time) {
      return res.status(400).json({
        message: 'You have already checked out today',
        checkOutTime: moment(attendance.checkOut.time).format('hh:mm A')
      });
    }

    // Save state before update for audit log
    const attendanceBefore = { ...attendance.toObject() };

    // Update check-out
    attendance.checkOut = {
      time: now.toDate(),
      location,
      notes
    };

    // Calculate overtime
    const workingHoursEnd = organization.settings.workingHours.end; // "18:00"
    const [endHour, endMinute] = workingHoursEnd.split(':').map(Number);
    const expectedCheckOut = moment().tz(timezone).set({
      hour: endHour,
      minute: endMinute,
      second: 0
    });

    if (now.isAfter(expectedCheckOut)) {
      attendance.overtime = now.diff(expectedCheckOut, 'minutes');
    }

    await attendance.save();

    // Log checkout in audit trail
    await auditService.logAttendanceUpdate(attendance, employee, attendanceBefore);

    res.json({
      message: 'Checked out successfully',
      attendance: {
        ...attendance.toObject(),
        checkInTime: moment(attendance.checkIn.time).tz(timezone).format('hh:mm A'),
        checkOutTime: moment(attendance.checkOut.time).tz(timezone).format('hh:mm A'),
        lateByFormatted: attendance.isLate ? formatLateTime(attendance.lateBy) : null,
        overtimeFormatted: attendance.overtime > 0 ? formatLateTime(attendance.overtime) : null
      },
      workingHours: attendance.workingHours,
      overtime: attendance.overtime,
      overtimeFormatted: attendance.overtime > 0 ? formatLateTime(attendance.overtime) : null
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ message: 'Error during check-out', error: error.message });
  }
});

// Get today's attendance status
router.get('/today', employeeAuth, async (req, res) => {
  try {
    const employee = req.employee;
    console.log('📅 Get today attendance for employee:', {
      id: employee._id,
      name: employee.name,
      email: employee.email,
      hasOrg: !!employee.organization
    });

    // Validate employee has organization
    if (!employee.organization) {
      console.log('❌ Employee has no organization assigned');
      return res.status(400).json({
        message: 'Employee is not assigned to any organization. Please contact your administrator.'
      });
    }

    const organization = await Organization.findById(employee.organization);

    if (!organization) {
      console.log('❌ Organization not found:', employee.organization);
      return res.status(400).json({
        message: 'Organization not found. Please contact your administrator.'
      });
    }

    console.log('✅ Organization found:', organization.name);

    const timezone = organization.settings?.timezone || 'UTC';
    const today = moment().tz(timezone).startOf('day').toDate();

    console.log('🔍 Searching for attendance:', {
      employee: employee._id,
      organization: employee.organization,
      date: today
    });

    const attendance = await Attendance.findOne({
      employee: employee._id,
      organization: employee.organization,
      date: today
    });

    console.log('✅ Attendance result:', {
      found: !!attendance,
      hasCheckedIn: !!(attendance && attendance.checkIn && attendance.checkIn.time),
      hasCheckedOut: !!(attendance && attendance.checkOut && attendance.checkOut.time)
    });

    res.json({
      attendance,
      hasCheckedIn: !!(attendance && attendance.checkIn && attendance.checkIn.time),
      hasCheckedOut: !!(attendance && attendance.checkOut && attendance.checkOut.time)
    });
  } catch (error) {
    console.error('❌ Get today attendance error:', error);
    res.status(500).json({ message: 'Error fetching today attendance', error: error.message });
  }
});

// Get my attendance for a month
router.get('/my-attendance', employeeAuth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const employee = req.employee;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendances = await Attendance.find({
      employee: employee._id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    // Calculate statistics
    const stats = {
      totalDays: attendances.length,
      presentDays: attendances.filter(a => a.status === 'present').length,
      lateDays: attendances.filter(a => a.isLate).length,
      totalHours: attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0),
      averageHours: 0
    };

    if (stats.totalDays > 0) {
      stats.averageHours = Math.round((stats.totalHours / stats.totalDays) * 100) / 100;
    }

    res.json({
      attendances,
      stats
    });
  } catch (error) {
    console.error('Get my attendance error:', error);
    res.status(500).json({ message: 'Error fetching attendance', error: error.message });
  }
});

// Get team attendance for today (for employees to see their team)
router.get('/team-today', employeeAuth, async (req, res) => {
  try {
    const employee = req.employee;

    // Validate employee has organization
    if (!employee.organization) {
      return res.status(400).json({
        message: 'Employee is not assigned to any organization.'
      });
    }

    const organization = await Organization.findById(employee.organization);

    if (!organization) {
      return res.status(400).json({
        message: 'Organization not found.'
      });
    }

    const timezone = organization.settings?.timezone || 'UTC';

    const today = moment().tz(timezone).startOf('day').toDate();

    // Get all employees in same department
    const teamMembers = await Employee.find({
      organization: employee.organization,
      department: employee.department,
      status: 'active',
      _id: { $ne: employee._id } // exclude self
    }).select('name email designation department');

    // Get today's attendance for all team members
    const attendances = await Attendance.find({
      organization: employee.organization,
      date: today,
      employee: { $in: teamMembers.map(m => m._id) }
    }).populate('employee', 'name email designation department');

    // Format attendance data with additional fields for UI
    const formattedAttendances = attendances.map(a => ({
      _id: a._id,
      employee: a.employee,
      date: a.date,
      checkInTime: a.checkIn?.time,
      checkOutTime: a.checkOut?.time,
      hasCheckedIn: !!(a.checkIn && a.checkIn.time),
      hasCheckedOut: !!(a.checkOut && a.checkOut.time),
      isLate: a.isLate,
      lateBy: a.lateBy,
      workingHours: a.workingHours,
      overtime: a.overtime,
      status: a.status
    }));

    // Add team members who haven't checked in yet
    const attendanceEmployeeIds = new Set(attendances.map(a => a.employee._id.toString()));
    const absentMembers = teamMembers
      .filter(tm => !attendanceEmployeeIds.has(tm._id.toString()))
      .map(tm => ({
        _id: null,
        employee: tm,
        date: today,
        checkInTime: null,
        checkOutTime: null,
        hasCheckedIn: false,
        hasCheckedOut: false,
        isLate: false,
        lateBy: 0,
        workingHours: 0,
        overtime: 0,
        status: 'absent'
      }));

    const allTeamData = [...formattedAttendances, ...absentMembers];

    res.json({
      attendances: allTeamData,
      teamMembers,
      stats: {
        total: teamMembers.length,
        present: formattedAttendances.filter(a => a.hasCheckedIn).length,
        absent: absentMembers.length,
        late: formattedAttendances.filter(a => a.isLate).length
      }
    });
  } catch (error) {
    console.error('Get team attendance error:', error);
    res.status(500).json({ message: 'Error fetching team attendance', error: error.message });
  }
});

// Get employee attendance preferences
router.get('/preferences', employeeAuth, async (req, res) => {
  try {
    const employee = req.employee;

    res.json({
      attendanceMode: employee.preferences?.attendanceMode || 'manual',
      autoCheckInEnabled: employee.preferences?.autoCheckInEnabled || false
    });
  } catch (error) {
    console.error('Get attendance preferences error:', error);
    res.status(500).json({ message: 'Error fetching preferences', error: error.message });
  }
});

// Update employee attendance preferences
router.put('/preferences', employeeAuth, async (req, res) => {
  try {
    const { attendanceMode, autoCheckInEnabled } = req.body;
    const employee = await Employee.findById(req.employee._id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Validate attendance mode
    const validModes = ['manual', 'gps', 'wifi', 'both'];
    if (attendanceMode && !validModes.includes(attendanceMode)) {
      return res.status(400).json({ message: 'Invalid attendance mode' });
    }

    // Update preferences
    if (attendanceMode !== undefined) {
      employee.preferences.attendanceMode = attendanceMode;
    }
    if (autoCheckInEnabled !== undefined) {
      employee.preferences.autoCheckInEnabled = autoCheckInEnabled;
    }

    await employee.save();

    res.json({
      message: 'Preferences updated successfully',
      preferences: {
        attendanceMode: employee.preferences.attendanceMode,
        autoCheckInEnabled: employee.preferences.autoCheckInEnabled
      }
    });
  } catch (error) {
    console.error('Update attendance preferences error:', error);
    res.status(500).json({ message: 'Error updating preferences', error: error.message });
  }
});

// Get organization settings for auto check-in
router.get('/organization-settings', employeeAuth, async (req, res) => {
  try {
    const organization = await Organization.findById(req.employee.organization);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Return only the settings needed for auto check-in (no sensitive data)
    res.json({
      companyLocation: organization.settings?.companyLocation || { enabled: false },
      companyWifi: organization.settings?.companyWifi || { enabled: false, networks: [] },
      autoCheckInWindow: organization.settings?.autoCheckInWindow || 90,
      workingHours: organization.settings?.workingHours,
      timezone: organization.settings?.timezone
    });
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get daily attendance for all employees (Admin only) - MUST BE BEFORE /employee/:employeeId
router.get('/daily', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const admin = req.user;

    // Use provided date or today
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Get organization for timezone
    const Organization = require('../models/Organization');
    const organization = await Organization.findById(admin._id);
    const timezone = organization?.settings?.timezone || 'UTC';

    const startOfDay = moment(targetDate).tz(timezone).startOf('day').toDate();
    const endOfDay = moment(targetDate).tz(timezone).endOf('day').toDate();

    // Get all employees in organization
    const employees = await Employee.find({
      organization: admin._id,
      status: 'active'
    }).select('_id name email employeeId department');

    // Get attendance records for the date
    const attendances = await Attendance.find({
      organization: admin._id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).populate('employee', 'name email employeeId department');

    // Create a map of employee attendance
    const attendanceMap = new Map();
    attendances.forEach(att => {
      attendanceMap.set(att.employee._id.toString(), att);
    });

    // Build response with all employees
    const result = employees.map(emp => {
      const attendance = attendanceMap.get(emp._id.toString());

      if (attendance) {
        return attendance;
      } else {
        // Employee hasn't checked in - mark as absent
        return {
          _id: null,
          employee: emp,
          date: startOfDay,
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          status: 'absent',
          isLate: false,
          lateBy: 0
        };
      }
    });

    res.json({
      success: true,
      attendances: result,
      date: targetDate
    });

  } catch (error) {
    console.error('Error fetching daily attendance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attendance records for a specific employee (Admin only)
router.get('/employee/:employeeId', auth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate, limit = 50, page = 1 } = req.query;

    // Validate employee ID
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    // Check if employee exists and belongs to the same organization
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Verify the employee belongs to the admin's organization
    if (employee.organization.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    // Build query
    const query = { employee: employeeId };
    if (Object.keys(dateFilter).length > 0) {
      query.date = dateFilter;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get attendance records
    const records = await Attendance.find(query)
      .populate('employee', 'name email department')
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const totalRecords = await Attendance.countDocuments(query);

    // Calculate statistics
    const stats = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          presentDays: {
            $sum: {
              $cond: [
                { $in: ['$status', ['present', 'late']] },
                1,
                0
              ]
            }
          },
          absentDays: {
            $sum: {
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
            }
          },
          lateDays: {
            $sum: {
              $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
            }
          },
          totalHours: { $sum: '$workingHours' },
          averageHours: { $avg: '$workingHours' }
        }
      }
    ]);

    const statistics = stats[0] || {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      totalHours: 0,
      averageHours: 0
    };

    res.json({
      success: true,
      records,
      statistics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / parseInt(limit)),
        totalRecords,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching employee attendance records:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
