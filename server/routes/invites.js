const express = require('express');
const crypto = require('crypto');
const Employee = require('../models/Employee');
const Invite = require('../models/Invite');
const jwt = require('jsonwebtoken');

const router = express.Router();

// @route   POST /api/invites/accept
// @desc    Accept invitation
// @access  Public
router.post('/accept', async (req, res) => {
  try {
    const { token, deviceInfo } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find employee with this token hash
    const employee = await Employee.findOne({
      'invitation.tokenHash': tokenHash,
      'invitation.status': 'invited'
    });

    if (!employee) {
      return res.status(400).json({ message: 'Invalid or expired invitation token' });
    }

    // Check if invitation is expired
    if (employee.isInvitationExpired()) {
      // Update status to expired
      employee.invitation.status = 'expired';
      await employee.save();

      await Invite.findOneAndUpdate(
        { employeeId: employee._id, status: 'sent' },
        { status: 'expired' }
      );

      return res.status(400).json({ message: 'Invitation has expired' });
    }

    // Check if already accepted
    if (employee.invitation.status === 'accepted') {
      return res.status(400).json({ message: 'Invitation already accepted' });
    }

    // Update employee invitation status
    employee.invitation.status = 'accepted';
    employee.invitation.acceptedAt = new Date();
    employee.emailVerified = true;
    await employee.save();

    // Update invite audit log
    await Invite.findOneAndUpdate(
      { employeeId: employee._id, status: 'sent' },
      { 
        status: 'accepted',
        acceptedAt: new Date(),
        deviceInfo
      }
    );

    // Generate onboarding token (short-lived)
    const onboardingToken = jwt.sign(
      { 
        employeeId: employee._id,
        email: employee.email,
        type: 'onboarding'
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    res.json({
      message: 'Invitation accepted successfully',
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        designation: employee.designation
      },
      onboardingToken
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/invites/validate/:token
// @desc    Validate invitation token
// @access  Public
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;
    console.log('token', token);

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find employee with this token hash
    const employee = await Employee.findOne({
      'invitation.tokenHash': tokenHash,
      'invitation.status': 'invited'
    }).select('name email department designation invitation');

    if (!employee) {
      return res.status(400).json({ message: 'Invalid invitation token' });
    }

    // Check if invitation is expired
    if (employee.isInvitationExpired()) {
      return res.status(400).json({ message: 'Invitation has expired' });
    }

    res.json({
      valid: true,
      employee: {
        name: employee.name,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        expiresAt: employee.invitation.expiresAt
      }
    });
  } catch (error) {
    console.error('Validate invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



