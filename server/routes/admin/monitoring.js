const express = require('express');
const router = express.Router();
const Attendance = require('../../models/Attendance');
const Employee = require('../../models/Employee');
const Organization = require('../../models/Organization');
const AttendanceCorrection = require('../../models/AttendanceCorrection');
const moment = require('moment-timezone');

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    const admin = await Organization.findById(decoded.userId).select('-password');

    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Get today's attendance overview
router.get('/today', adminAuth, async (req, res) => {
  try {
    const admin = req.admin;
    const timezone = admin.settings?.timezone || 'UTC';
    const today = moment().tz(timezone).startOf('day').toDate();

    // Get all active employees
    const totalEmployees = await Employee.countDocuments({
      organization: admin._id,
      status: 'active'
    });

    // Get today's attendance
    const todayAttendance = await Attendance.find({
      organization: admin._id,
      date: today
    }).populate('employee', 'name email employeeId department');

    // Calculate statistics
    const stats = {
      totalEmployees,
      present: todayAttendance.filter(a => a.checkIn?.time).length,
      absent: totalEmployees - todayAttendance.filter(a => a.checkIn?.time).length,
      late: todayAttendance.filter(a => a.isLate).length,
      checkedOut: todayAttendance.filter(a => a.checkOut?.time).length,
      notCheckedOut: todayAttendance.filter(a => a.checkIn?.time && !a.checkOut?.time).length,
      onLeave: todayAttendance.filter(a => a.status === 'leave').length
    };

    // Get list of employees who haven't checked in
    const checkedInEmployeeIds = todayAttendance
      .filter(a => a.checkIn?.time)
      .map(a => a.employee._id.toString());

    const absentEmployees = await Employee.find({
      organization: admin._id,
      status: 'active',
      _id: { $nin: checkedInEmployeeIds }
    }).select('name email employeeId department').limit(20);

    // Get late employees details
    const lateEmployees = todayAttendance
      .filter(a => a.isLate)
      .map(a => ({
        employee: a.employee,
        checkInTime: a.checkIn.time,
        lateBy: a.lateBy,
        lateByFormatted: formatLateTime(a.lateBy)
      }));

    // Get employees who haven't checked out
    const notCheckedOutEmployees = todayAttendance
      .filter(a => a.checkIn?.time && !a.checkOut?.time)
      .map(a => ({
        employee: a.employee,
        checkInTime: a.checkIn.time
      }));

    res.json({
      stats,
      absentEmployees,
      lateEmployees,
      notCheckedOutEmployees,
      date: today
    });
  } catch (error) {
    console.error('Get today monitoring error:', error);
    res.status(500).json({ message: 'Error fetching today\'s monitoring data', error: error.message });
  }
});

// Get attendance for specific date
router.get('/date/:date', adminAuth, async (req, res) => {
  try {
    const { date } = req.params;
    const admin = req.admin;
    const timezone = admin.settings?.timezone || 'UTC';

    const targetDate = moment(date).tz(timezone).startOf('day').toDate();

    const attendances = await Attendance.find({
      organization: admin._id,
      date: targetDate
    }).populate('employee', 'name email employeeId department').sort({ 'checkIn.time': 1 });

    // Get all active employees for that day
    const totalEmployees = await Employee.countDocuments({
      organization: admin._id,
      status: 'active'
    });

    const stats = {
      totalEmployees,
      present: attendances.filter(a => a.checkIn?.time).length,
      absent: totalEmployees - attendances.filter(a => a.checkIn?.time).length,
      late: attendances.filter(a => a.isLate).length,
      checkedOut: attendances.filter(a => a.checkOut?.time).length,
      notCheckedOut: attendances.filter(a => a.checkIn?.time && !a.checkOut?.time).length,
      totalWorkingHours: attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0).toFixed(2),
      averageWorkingHours: attendances.length > 0
        ? (attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0) / attendances.length).toFixed(2)
        : 0
    };

    res.json({
      date: targetDate,
      stats,
      attendances: attendances.map(a => ({
        ...a.toObject(),
        checkInTimeFormatted: a.checkIn?.time ? moment(a.checkIn.time).tz(timezone).format('hh:mm A') : null,
        checkOutTimeFormatted: a.checkOut?.time ? moment(a.checkOut.time).tz(timezone).format('hh:mm A') : null,
        lateByFormatted: a.isLate ? formatLateTime(a.lateBy) : null
      }))
    });
  } catch (error) {
    console.error('Get date monitoring error:', error);
    res.status(500).json({ message: 'Error fetching date monitoring data', error: error.message });
  }
});

// Get employee attendance history
router.get('/employee/:employeeId', adminAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate, limit = 30, skip = 0 } = req.query;
    const admin = req.admin;
    const timezone = admin.settings?.timezone || 'UTC';

    // Verify employee belongs to admin's organization
    const employee = await Employee.findById(employeeId);
    if (!employee || employee.organization.toString() !== admin._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to view this employee\'s attendance' });
    }

    const query = {
      employee: employeeId,
      organization: admin._id
    };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = moment(startDate).tz(timezone).startOf('day').toDate();
      }
      if (endDate) {
        query.date.$lte = moment(endDate).tz(timezone).endOf('day').toDate();
      }
    }

    const attendances = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Attendance.countDocuments(query);

    // Calculate statistics
    const stats = {
      totalDays: attendances.length,
      presentDays: attendances.filter(a => a.checkIn?.time).length,
      lateDays: attendances.filter(a => a.isLate).length,
      totalWorkingHours: attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0).toFixed(2),
      averageWorkingHours: attendances.length > 0
        ? (attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0) / attendances.length).toFixed(2)
        : 0,
      totalLateMinutes: attendances.reduce((sum, a) => sum + (a.lateBy || 0), 0),
      totalOvertime: attendances.reduce((sum, a) => sum + (a.overtime || 0), 0)
    };

    res.json({
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department
      },
      stats,
      attendances: attendances.map(a => ({
        ...a.toObject(),
        checkInTimeFormatted: a.checkIn?.time ? moment(a.checkIn.time).tz(timezone).format('hh:mm A') : null,
        checkOutTimeFormatted: a.checkOut?.time ? moment(a.checkOut.time).tz(timezone).format('hh:mm A') : null,
        lateByFormatted: a.isLate ? formatLateTime(a.lateBy) : null
      })),
      total,
      hasMore: skip + attendances.length < total
    });
  } catch (error) {
    console.error('Get employee monitoring error:', error);
    res.status(500).json({ message: 'Error fetching employee monitoring data', error: error.message });
  }
});

// Get attendance summary for date range
router.get('/summary', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    const admin = req.admin;
    const timezone = admin.settings?.timezone || 'UTC';

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const start = moment(startDate).tz(timezone).startOf('day').toDate();
    const end = moment(endDate).tz(timezone).endOf('day').toDate();

    // Build query
    const attendanceQuery = {
      organization: admin._id,
      date: { $gte: start, $lte: end }
    };

    const employeeQuery = {
      organization: admin._id,
      status: 'active'
    };

    if (department) {
      employeeQuery.department = department;
    }

    // Get total employees
    const totalEmployees = await Employee.countDocuments(employeeQuery);

    // Get attendances for the period
    const attendances = await Attendance.find(attendanceQuery)
      .populate('employee', 'name email employeeId department');

    // Filter by department if needed
    let filteredAttendances = attendances;
    if (department) {
      filteredAttendances = attendances.filter(a => a.employee.department === department);
    }

    // Calculate working days in range
    const workingDays = calculateWorkingDays(start, end, admin.settings.workingDays);

    // Calculate statistics
    const stats = {
      totalEmployees,
      workingDays,
      totalPresent: filteredAttendances.filter(a => a.checkIn?.time).length,
      totalLate: filteredAttendances.filter(a => a.isLate).length,
      totalWorkingHours: filteredAttendances.reduce((sum, a) => sum + (a.workingHours || 0), 0).toFixed(2),
      averageWorkingHoursPerDay: filteredAttendances.length > 0
        ? (filteredAttendances.reduce((sum, a) => sum + (a.workingHours || 0), 0) / filteredAttendances.length).toFixed(2)
        : 0,
      totalOvertime: filteredAttendances.reduce((sum, a) => sum + (a.overtime || 0), 0),
      attendanceRate: totalEmployees > 0 && workingDays > 0
        ? ((filteredAttendances.filter(a => a.checkIn?.time).length / (totalEmployees * workingDays)) * 100).toFixed(2)
        : 0
    };

    // Get top late employees
    const employeeLateCount = {};
    filteredAttendances.forEach(a => {
      if (a.isLate) {
        const empId = a.employee._id.toString();
        if (!employeeLateCount[empId]) {
          employeeLateCount[empId] = {
            employee: a.employee,
            lateCount: 0,
            totalLateMinutes: 0
          };
        }
        employeeLateCount[empId].lateCount++;
        employeeLateCount[empId].totalLateMinutes += a.lateBy;
      }
    });

    const topLateEmployees = Object.values(employeeLateCount)
      .sort((a, b) => b.lateCount - a.lateCount)
      .slice(0, 10);

    res.json({
      period: {
        startDate: start,
        endDate: end,
        workingDays
      },
      stats,
      topLateEmployees,
      department: department || 'All'
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ message: 'Error fetching summary data', error: error.message });
  }
});

// Get incomplete checkouts
router.get('/incomplete-checkouts', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const admin = req.admin;
    const timezone = admin.settings?.timezone || 'UTC';

    const query = {
      organization: admin._id,
      'checkIn.time': { $exists: true },
      'checkOut.time': { $exists: false }
    };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = moment(startDate).tz(timezone).startOf('day').toDate();
      }
      if (endDate) {
        query.date.$lte = moment(endDate).tz(timezone).endOf('day').toDate();
      }
    }

    const incompleteAttendances = await Attendance.find(query)
      .populate('employee', 'name email employeeId department')
      .sort({ date: -1 });

    res.json({
      total: incompleteAttendances.length,
      attendances: incompleteAttendances.map(a => ({
        ...a.toObject(),
        checkInTimeFormatted: moment(a.checkIn.time).tz(timezone).format('hh:mm A'),
        dateFormatted: moment(a.date).tz(timezone).format('YYYY-MM-DD')
      }))
    });
  } catch (error) {
    console.error('Get incomplete checkouts error:', error);
    res.status(500).json({ message: 'Error fetching incomplete checkouts', error: error.message });
  }
});

// Get dashboard statistics
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const admin = req.admin;
    const timezone = admin.settings?.timezone || 'UTC';
    const today = moment().tz(timezone).startOf('day').toDate();
    const thisMonthStart = moment().tz(timezone).startOf('month').toDate();

    // Total active employees
    const totalEmployees = await Employee.countDocuments({
      organization: admin._id,
      status: 'active'
    });

    // Today's stats
    const todayAttendance = await Attendance.find({
      organization: admin._id,
      date: today
    });

    const todayStats = {
      present: todayAttendance.filter(a => a.checkIn?.time).length,
      late: todayAttendance.filter(a => a.isLate).length,
      notCheckedOut: todayAttendance.filter(a => a.checkIn?.time && !a.checkOut?.time).length
    };

    // This month's stats
    const thisMonthAttendance = await Attendance.find({
      organization: admin._id,
      date: { $gte: thisMonthStart }
    });

    const thisMonthStats = {
      totalPresent: thisMonthAttendance.filter(a => a.checkIn?.time).length,
      totalLate: thisMonthAttendance.filter(a => a.isLate).length,
      averageWorkingHours: thisMonthAttendance.length > 0
        ? (thisMonthAttendance.reduce((sum, a) => sum + (a.workingHours || 0), 0) / thisMonthAttendance.length).toFixed(2)
        : 0
    };

    // Pending correction requests
    const pendingCorrections = await AttendanceCorrection.countDocuments({
      organization: admin._id,
      status: 'pending'
    });

    res.json({
      totalEmployees,
      today: todayStats,
      thisMonth: thisMonthStats,
      pendingCorrections
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
});

// Helper functions
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

const calculateWorkingDays = (startDate, endDate, workingDays) => {
  let count = 0;
  const current = moment(startDate);
  const end = moment(endDate);

  while (current.isSameOrBefore(end)) {
    const dayOfWeek = current.day(); // 0 = Sunday, 1 = Monday, etc.
    if (workingDays.includes(dayOfWeek)) {
      count++;
    }
    current.add(1, 'day');
  }

  return count;
};

module.exports = router;
