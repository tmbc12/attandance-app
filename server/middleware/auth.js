const jwt = require('jsonwebtoken');
const Organization = require('../models/Organization');
const Employee = require('../models/Employee');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Check if it's an admin token (has 'id' field)
    if (decoded.id) {
      const organization = await Organization.findById(decoded.id).select('-password');
      if (!organization || !organization.isActive) {
        return res.status(401).json({ message: 'Token is not valid' });
      }
      req.user = organization;
    }
    // Check if it's an employee token (has 'userId' field)
    else if (decoded.userId) {
      const employee = await Employee.findById(decoded.userId);
      if (!employee || employee.status !== 'active') {
        return res.status(401).json({ message: 'Token is not valid' });
      }
      req.user = employee;
    }
    else {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Handle admin/organization users (have permissions array)
    if (req.user.permissions && Array.isArray(req.user.permissions)) {
      if (req.user.role === 'super_admin' || req.user.permissions.includes(permission)) {
        next();
      } else {
        res.status(403).json({ message: 'Insufficient permissions' });
      }
    }
    // Handle employee users (don't have permissions array)
    else {
      // Employees can only access their own data and organization settings
      if (permission === 'manage_employees' || permission === 'manage_organization') {
        res.status(403).json({ message: 'Insufficient permissions' });
      } else {
        next();
      }
    }
  };
};

module.exports = { auth, requirePermission };



