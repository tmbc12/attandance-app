const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const AttendanceCorrection = require('../models/AttendanceCorrection');
const Employee = require('../models/Employee');
const Organization = require('../models/Organization');
const moment = require('moment-timezone');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');
const { auth } = require('../middleware/auth');

// Employee authentication middleware
const employeeAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

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

// Employee: Submit correction request
router.post('/request', employeeAuth, async (req, res) => {
  try {
    const { attendanceId, requestType, requestedCheckIn, requestedCheckOut, reason } = req.body;
    const employee = req.employee;

    // Validate employee has organization
    if (!employee.organization) {
      return res.status(400).json({
        message: 'Employee is not assigned to any organization.'
      });
    }

    // Validate attendance record exists
    const attendance = await Attendance.findById(attendanceId);

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Verify attendance belongs to this employee
    if (attendance.employee.toString() !== employee._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to modify this attendance record' });
    }

    // Check if there's already a pending request for this attendance
    const existingRequest = await AttendanceCorrection.findOne({
      attendance: attendanceId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        message: 'There is already a pending correction request for this attendance record'
      });
    }

    // Validate request type
    if (!['check-in', 'check-out', 'both', 'forgot-checkout'].includes(requestType)) {
      return res.status(400).json({ message: 'Invalid request type' });
    }

    // Validate reason
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        message: 'Please provide a detailed reason (at least 10 characters)'
      });
    }

    const organization = await Organization.findById(employee.organization);
    const timezone = organization.settings?.timezone || 'UTC';

    // Create correction request
    const correction = new AttendanceCorrection({
      attendance: attendanceId,
      employee: employee._id,
      organization: employee.organization,
      requestType,
      originalCheckIn: attendance.checkIn,
      originalCheckOut: attendance.checkOut,
      reason: reason.trim(),
      status: 'pending'
    });

    // Parse and validate requested times
    if (requestType === 'check-in' || requestType === 'both') {
      if (!requestedCheckIn || !requestedCheckIn.time) {
        return res.status(400).json({ message: 'Requested check-in time is required' });
      }

      const requestedTime = moment(requestedCheckIn.time).tz(timezone);
      const attendanceDate = moment(attendance.date).tz(timezone);

      // Ensure requested time is on the same day
      if (!requestedTime.isSame(attendanceDate, 'day')) {
        return res.status(400).json({
          message: 'Requested check-in time must be on the same date as the attendance record'
        });
      }

      correction.requestedCheckIn = {
        time: requestedTime.toDate(),
        location: requestedCheckIn.location || attendance.checkIn?.location,
        notes: requestedCheckIn.notes
      };
    }

    if (requestType === 'check-out' || requestType === 'both' || requestType === 'forgot-checkout') {
      if (!requestedCheckOut || !requestedCheckOut.time) {
        return res.status(400).json({ message: 'Requested check-out time is required' });
      }

      const requestedTime = moment(requestedCheckOut.time).tz(timezone);
      const attendanceDate = moment(attendance.date).tz(timezone);

      // Ensure requested checkout time is on the same day as attendance record
      const checkOutDate = requestedTime.clone().startOf('day');
      const attendanceDateOnly = attendanceDate.clone().startOf('day');

      if (!checkOutDate.isSame(attendanceDateOnly, 'day')) {
        return res.status(400).json({
          message: 'Requested check-out time must be on the same date as the attendance record'
        });
      }

      // Ensure requested time is after check-in
      const checkInTime = correction.requestedCheckIn?.time || attendance.checkIn?.time;
      if (checkInTime && requestedTime.isBefore(moment(checkInTime))) {
        return res.status(400).json({
          message: 'Requested check-out time must be after check-in time'
        });
      }

      correction.requestedCheckOut = {
        time: requestedTime.toDate(),
        location: requestedCheckOut.location || attendance.checkIn?.location,
        notes: requestedCheckOut.notes
      };
    }

    await correction.save();

    // Log in audit trail
    await auditService.logCorrectionRequest(correction, employee);

    // Notify admin
    await notificationService.sendCorrectionRequestedNotification(
      employee.organization,
      employee,
      correction
    );

    res.status(201).json({
      message: 'Correction request submitted successfully',
      correction: await correction.populate('attendance')
    });
  } catch (error) {
    console.error('Submit correction request error:', error);
    res.status(500).json({ message: 'Error submitting correction request', error: error.message });
  }
});

// Employee: Get my correction requests
router.get('/my-requests', employeeAuth, async (req, res) => {
  try {
    const { status, limit = 20, skip = 0 } = req.query;
    const employee = req.employee;

    const query = { employee: employee._id };
    if (status) {
      query.status = status;
    }

    const corrections = await AttendanceCorrection.find(query)
      .populate('attendance')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AttendanceCorrection.countDocuments(query);

    res.json({
      corrections,
      total,
      hasMore: skip + corrections.length < total
    });
  } catch (error) {
    console.error('Get my correction requests error:', error);
    res.status(500).json({ message: 'Error fetching correction requests', error: error.message });
  }
});

// Admin: Get all pending correction requests
router.get('/pending', auth, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const admin = req.user;

    const corrections = await AttendanceCorrection.find({
      organization: admin._id,
      status: 'pending'
    })
      .populate('employee', 'name email employeeId department')
      .populate('attendance')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AttendanceCorrection.countDocuments({
      organization: admin._id,
      status: 'pending'
    });

    res.json({
      corrections,
      total,
      hasMore: skip + corrections.length < total
    });
  } catch (error) {
    console.error('Get pending corrections error:', error);
    res.status(500).json({ message: 'Error fetching pending corrections', error: error.message });
  }
});

// Admin: Approve correction request
router.post('/:correctionId/approve', auth, async (req, res) => {
  try {
    const { correctionId } = req.params;
    const { notes } = req.body;
    const admin = req.user;

    const correction = await AttendanceCorrection.findById(correctionId).populate('attendance');

    if (!correction) {
      return res.status(404).json({ message: 'Correction request not found' });
    }

    // Verify correction belongs to admin's organization
    if (correction.organization.toString() !== admin._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to approve this correction' });
    }

    if (correction.status !== 'pending') {
      return res.status(400).json({
        message: `This correction request has already been ${correction.status}`
      });
    }

    // Update attendance record
    const attendance = await Attendance.findById(correction.attendance._id);

    if (!attendance) {
      return res.status(404).json({ message: 'Associated attendance record not found' });
    }

    // Save state before update for audit log
    const attendanceBefore = { ...attendance.toObject() };

    // Apply corrections based on request type
    if (correction.requestType === 'check-in' || correction.requestType === 'both') {
      attendance.checkIn = correction.requestedCheckIn;
    }

    if (correction.requestType === 'check-out' || correction.requestType === 'both' || correction.requestType === 'forgot-checkout') {
      attendance.checkOut = correction.requestedCheckOut;
    }

    // Recalculate late status if check-in was modified
    if (correction.requestType === 'check-in' || correction.requestType === 'both') {
      const organization = await Organization.findById(attendance.organization);
      const timezone = organization.settings?.timezone || 'UTC';
      const workingHoursStart = organization.settings.workingHours.start;
      const [startHour, startMinute] = workingHoursStart.split(':').map(Number);

      const checkInTime = moment(attendance.checkIn.time).tz(timezone);
      const expectedCheckIn = moment(attendance.checkIn.time).tz(timezone).set({
        hour: startHour,
        minute: startMinute,
        second: 0
      });

      const isLate = checkInTime.isAfter(expectedCheckIn);
      const lateBy = isLate ? checkInTime.diff(expectedCheckIn, 'minutes') : 0;

      attendance.isLate = isLate;
      attendance.lateBy = lateBy;
      attendance.status = isLate ? 'late' : 'present';
    }

    await attendance.save();

    // Update correction status
    correction.status = 'approved';
    correction.reviewedBy = admin._id;
    correction.reviewedAt = new Date();
    correction.reviewNotes = notes || 'Approved';

    await correction.save();

    // Get employee for notifications
    const employee = await Employee.findById(correction.employee);

    // Log in audit trail
    await auditService.logCorrectionApprove(
      correction,
      admin,
      employee,
      attendanceBefore,
      attendance.toObject()
    );

    // Notify employee
    await notificationService.sendCorrectionApprovedNotification(employee, correction);

    res.json({
      message: 'Correction request approved successfully',
      correction: await correction.populate('employee', 'name email employeeId'),
      attendance
    });
  } catch (error) {
    console.error('Approve correction error:', error);
    res.status(500).json({ message: 'Error approving correction request', error: error.message });
  }
});

// Admin: Reject correction request
router.post('/:correctionId/reject', auth, async (req, res) => {
  try {
    const { correctionId } = req.params;
    const { notes } = req.body;
    const admin = req.user;

    if (!notes || notes.trim().length < 5) {
      return res.status(400).json({
        message: 'Please provide a reason for rejection (at least 5 characters)'
      });
    }

    const correction = await AttendanceCorrection.findById(correctionId);

    if (!correction) {
      return res.status(404).json({ message: 'Correction request not found' });
    }

    // Verify correction belongs to admin's organization
    if (correction.organization.toString() !== admin._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to reject this correction' });
    }

    if (correction.status !== 'pending') {
      return res.status(400).json({
        message: `This correction request has already been ${correction.status}`
      });
    }

    // Update correction status
    correction.status = 'rejected';
    correction.reviewedBy = admin._id;
    correction.reviewedAt = new Date();
    correction.reviewNotes = notes.trim();

    await correction.save();

    // Get employee for notifications
    const employee = await Employee.findById(correction.employee);

    // Log in audit trail
    await auditService.logCorrectionReject(correction, admin, employee);

    // Notify employee
    await notificationService.sendCorrectionRejectedNotification(employee, correction);

    res.json({
      message: 'Correction request rejected',
      correction: await correction.populate('employee', 'name email employeeId')
    });
  } catch (error) {
    console.error('Reject correction error:', error);
    res.status(500).json({ message: 'Error rejecting correction request', error: error.message });
  }
});

// Admin: Get all corrections (with filters)
router.get('/all', auth, async (req, res) => {
  try {
    const { status, employeeId, startDate, endDate, limit = 50, skip = 0 } = req.query;
    const admin = req.user;

    const query = { organization: admin._id };

    if (status) {
      query.status = status;
    }

    if (employeeId) {
      query.employee = employeeId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const corrections = await AttendanceCorrection.find(query)
      .populate('employee', 'name email employeeId department')
      .populate('attendance')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AttendanceCorrection.countDocuments(query);

    res.json({
      corrections,
      total,
      hasMore: skip + corrections.length < total
    });
  } catch (error) {
    console.error('Get all corrections error:', error);
    res.status(500).json({ message: 'Error fetching corrections', error: error.message });
  }
});

module.exports = router;
