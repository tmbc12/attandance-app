const express = require('express');
const Employee = require('../models/Employee');
const Invite = require('../models/Invite');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/reports/invites
// @desc    Get invitation reports
// @access  Private
router.get('/invites', auth, requirePermission('view_reports'), async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      status, 
      department, 
      invitedBy,
      page = 1, 
      limit = 10 
    } = req.query;

    const query = {};

    // Date range filter
    if (startDate || endDate) {
      query.sentAt = {};
      if (startDate) query.sentAt.$gte = new Date(startDate);
      if (endDate) query.sentAt.$lte = new Date(endDate);
    }

    if (status) query.status = status;
    if (invitedBy) query.invitedBy = invitedBy;

    // If department filter is provided, we need to join with Employee collection
    let pipeline = [];

    if (department) {
      pipeline.push({
        $lookup: {
          from: 'employees',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employee'
        }
      });
      pipeline.push({
        $match: {
          'employee.department': department
        }
      });
    }

    // Add base match conditions
    pipeline.push({
      $match: query
    });

    // Add pagination
    pipeline.push(
      { $sort: { sentAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    );

    // Add lookup for admin details
    pipeline.push({
      $lookup: {
        from: 'admins',
        localField: 'invitedBy',
        foreignField: '_id',
        as: 'admin'
      }
    });

    pipeline.push({
      $lookup: {
        from: 'employees',
        localField: 'employeeId',
        foreignField: '_id',
        as: 'employee'
      }
    });

    const invites = await Invite.aggregate(pipeline);

    // Get total count for pagination
    const countPipeline = [...pipeline];
    countPipeline.splice(-3); // Remove sort, skip, limit
    countPipeline.push({ $count: 'total' });
    const countResult = await Invite.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    res.json({
      invites,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get invites report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/invites/stats
// @desc    Get invitation statistics
// @access  Private
router.get('/invites/stats', auth, requirePermission('view_reports'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.sentAt = {};
      if (startDate) matchQuery.sentAt.$gte = new Date(startDate);
      if (endDate) matchQuery.sentAt.$lte = new Date(endDate);
    }

    const stats = await Invite.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total employees by status
    const employeeStats = await Employee.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get department distribution
    const departmentStats = await Employee.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get invitation trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trends = await Invite.aggregate([
      {
        $match: {
          sentAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$sentAt' },
            month: { $month: '$sentAt' },
            day: { $dayOfMonth: '$sentAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      inviteStats: stats,
      employeeStats,
      departmentStats,
      trends
    });
  } catch (error) {
    console.error('Get invite stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/employees
// @desc    Get employee reports
// @access  Private
router.get('/employees', auth, requirePermission('view_reports'), async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      status, 
      department,
      page = 1, 
      limit = 10 
    } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (status) query.status = status;
    if (department) query.department = department;

    const employees = await Employee.find(query)
      .populate('invitation.invitedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Employee.countDocuments(query);

    res.json({
      employees,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get employees report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



