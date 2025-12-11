const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const Employee = require('../models/Employee');
const Organization = require('../models/Organization');

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

// Employee: Get my notifications
router.get('/employee', employeeAuth, async (req, res) => {
  try {
    const { limit = 20, skip = 0, unreadOnly = false } = req.query;
    const employee = req.employee;

    const result = await notificationService.getNotifications(
      employee._id,
      'Employee',
      parseInt(limit),
      parseInt(skip),
      unreadOnly === 'true'
    );

    res.json(result);
  } catch (error) {
    console.error('Get employee notifications error:', error);
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

// Admin: Get my notifications
router.get('/admin', adminAuth, async (req, res) => {
  try {
    const { limit = 20, skip = 0, unreadOnly = false } = req.query;
    const admin = req.admin;

    const result = await notificationService.getNotifications(
      admin._id,
      'Organization',
      parseInt(limit),
      parseInt(skip),
      unreadOnly === 'true'
    );

    res.json(result);
  } catch (error) {
    console.error('Get admin notifications error:', error);
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

// Employee: Mark notification as read
router.put('/employee/:notificationId/read', employeeAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const employee = req.employee;

    const notification = await notificationService.markAsRead(notificationId, employee._id);

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
});

// Admin: Mark notification as read
router.put('/admin/:notificationId/read', adminAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const admin = req.admin;

    const notification = await notificationService.markAsRead(notificationId, admin._id);

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
});

// Employee: Mark all notifications as read
router.put('/employee/read-all', employeeAuth, async (req, res) => {
  try {
    const employee = req.employee;

    const result = await notificationService.markAllAsRead(employee._id, 'Employee');

    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Error marking all notifications as read', error: error.message });
  }
});

// Admin: Mark all notifications as read
router.put('/admin/read-all', adminAuth, async (req, res) => {
  try {
    const admin = req.admin;

    const result = await notificationService.markAllAsRead(admin._id, 'Organization');

    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Error marking all notifications as read', error: error.message });
  }
});

module.exports = router;
