const express = require('express');
const crypto = require('crypto');
const Employee = require('../models/Employee');
const Invite = require('../models/Invite');
const { auth, requirePermission } = require('../middleware/auth');
const { sendInviteEmail } = require('../utils/email');

const router = express.Router();

// @route   GET /api/employees
// @desc    Get all employees
// @access  Private
router.get('/', auth, requirePermission('manage_employees'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, department, search } = req.query;
    const query = { organization: req.user._id };

    if (status) query.status = status;
    if (department) query.department = department;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const employees = await Employee.find(query)
      .populate('department', 'name')
      .populate('invitation.invitedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Employee.countDocuments(query);

    res.json({
      employees,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/employees/:id
// @desc    Get single employee
// @access  Private
router.get('/:id', auth, requirePermission('manage_employees'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('invitation.invitedBy', 'name email');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/employees
// @desc    Create employee and send invitation
// @access  Private
router.post('/', auth, requirePermission('manage_employees'), async (req, res) => {
  try {
    const { name, email, department, designation, role = 'employee', sendInvite = true } = req.body;

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }

    console.log(`[info] - req.user._id - ${req.user._id}`)
    // Find department by name if string is provided
    let departmentId = department;
    if (typeof department === 'string') {
      const Department = require('../models/Department');
      const dept = await Department.findOne({
        organization: req.user._id,
        _id: department,
        isActive: true
      });
      if (!dept) {
        return res.status(400).json({ message: `Department '${department}' not found` });
      }
      departmentId = dept._id;
    }

    // Generate employee ID
    const employeeCount = await Employee.countDocuments({ organization: req.user._id });
    const employeeId = `EMP${String(employeeCount + 1).padStart(6, '0')}`;

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create employee
    const employee = new Employee({
      organization: req.user._id,
      employeeId,
      name,
      email,
      department: departmentId,
      designation,
      role,
      status: 'pending',
      invitation: {
        status: sendInvite ? 'invited' : 'draft',
        tokenHash,
        expiresAt: sendInvite ? expiresAt : null,
        sentAt: sendInvite ? new Date() : null,
        invitedBy: req.user._id
      }
    });

    await employee.save();

    // Create invite audit log
    const invite = new Invite({
      employeeId: employee._id,
      email: employee.email,
      tokenHash,
      status: sendInvite ? 'sent' : 'draft',
      invitedBy: req.user._id,
      ip: req.ip
    });
    await invite.save();

    // Send invitation email if requested
    if (sendInvite) {
      try {
        await sendInviteEmail(employee.email, token, employee.name);
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.status(201).json({
      employee,
      invite: {
        token: sendInvite ? token : null,
        expiresAt: sendInvite ? expiresAt : null
      }
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/employees/bulk-invite
// @desc    Bulk invite employees
// @access  Private
router.post('/bulk-invite', auth, requirePermission('bulk_operations'), async (req, res) => {
  try {
    const { employees } = req.body;

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ message: 'Employees array is required' });
    }

    const results = {
      created: [],
      duplicates: [],
      invalid: [],
      errors: []
    };

    for (const emp of employees) {
      try {
        const { name, email, department, designation, role = 'employee' } = emp;

        if (!name || !email || !department || !designation) {
          results.invalid.push({ ...emp, error: 'Missing required fields' });
          continue;
        }

        // Check if employee already exists
        const existingEmployee = await Employee.findOne({ email });
        if (existingEmployee) {
          results.duplicates.push({ ...emp, employeeId: existingEmployee.employeeId });
          continue;
        }

        // Generate invitation token
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Create employee
        const employee = new Employee({
          organization: req.user._id,
          employeeId: `EMP${String(employeeCount + bulkCount).padStart(6, '0')}`,
          name,
          email,
          department,
          designation,
          role,
          status: 'pending',
          invitation: {
            status: 'invited',
            tokenHash,
            expiresAt,
            sentAt: new Date(),
            invitedBy: req.user._id
          }
        });

        await employee.save();

        // Create invite audit log
        const invite = new Invite({
          employeeId: employee._id,
          email: employee.email,
          tokenHash,
          status: 'sent',
          invitedBy: req.user._id,
          ip: req.ip
        });
        await invite.save();

        // Send invitation email
        try {
          await sendInviteEmail(employee.email, token, employee.name);
        } catch (emailError) {
          console.error('Email sending error for', email, ':', emailError);
        }

        results.created.push({
          employeeId: employee.employeeId,
          name: employee.name,
          email: employee.email,
          token
        });
      } catch (error) {
        results.errors.push({ ...emp, error: error.message });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Bulk invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/employees/:id/invite/resend
// @desc    Resend invitation
// @access  Private
router.post('/:id/invite/resend', auth, requirePermission('manage_invites'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (employee.status !== 'pending') {
      return res.status(400).json({ message: 'Employee is not in pending status' });
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update employee invitation
    employee.invitation = {
      status: 'invited',
      tokenHash,
      expiresAt,
      sentAt: new Date(),
      invitedBy: req.user._id
    };

    await employee.save();

    // Create new invite audit log
    const invite = new Invite({
      employeeId: employee._id,
      email: employee.email,
      tokenHash,
      status: 'sent',
      invitedBy: req.user._id,
      ip: req.ip,
      resendCount: 1
    });
    await invite.save();

    // Send invitation email
    try {
      await sendInviteEmail(employee.email, token, employee.name);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return res.status(500).json({ message: 'Failed to send email' });
    }

    res.json({
      message: 'Invitation resent successfully',
      invite: {
        token,
        expiresAt
      }
    });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/employees/:id/invite/revoke
// @desc    Revoke invitation
// @access  Private
router.post('/:id/invite/revoke', auth, requirePermission('manage_invites'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (employee.invitation.status !== 'invited') {
      return res.status(400).json({ message: 'No active invitation to revoke' });
    }

    // Update employee invitation status
    employee.invitation.status = 'revoked';
    await employee.save();

    // Update invite audit log
    await Invite.findOneAndUpdate(
      { employeeId: employee._id, status: 'sent' },
      { 
        status: 'revoked',
        revokedAt: new Date()
      }
    );

    res.json({ message: 'Invitation revoked successfully' });
  } catch (error) {
    console.error('Revoke invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private
router.put('/:id', auth, requirePermission('manage_employees'), async (req, res) => {
  try {
    const { name, department, designation, role, status } = req.body;
    
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Update fields
    if (name) employee.name = name;
    if (department) employee.department = department;
    if (designation) employee.designation = designation;
    if (role) employee.role = role;
    if (status) employee.status = status;

    await employee.save();

    res.json(employee);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/employees/:id
// @desc    Delete employee
// @access  Private
router.delete('/:id', auth, requirePermission('manage_employees'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await Employee.findByIdAndDelete(req.params.id);
    await Invite.deleteMany({ employeeId: req.params.id });

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/employees/register
// @desc    Complete employee registration from invite
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { token, password, name } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Hash the token to find the employee
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find employee with this token
    const employee = await Employee.findOne({
      'invitation.tokenHash': tokenHash,
      'invitation.status': 'invited',
      'invitation.expiresAt': { $gt: new Date() }
    }).populate('department', 'name').populate('organization');

    if (!employee) {
      return res.status(400).json({ message: 'Invalid or expired invitation token' });
    }

    // Update employee
    if (name) employee.name = name;
    employee.password = password; // Will be hashed by pre-save hook
    employee.status = 'active';
    employee.invitation.status = 'accepted';
    employee.invitation.acceptedAt = new Date();

    await employee.save();

    // Update invite audit log
    await Invite.findOneAndUpdate(
      { employeeId: employee._id, tokenHash },
      {
        status: 'accepted',
        acceptedAt: new Date()
      }
    );

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const authToken = jwt.sign(
      {
        userId: employee._id,
        email: employee.email,
        role: employee.role,
        organization: employee.organization
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Registration completed successfully',
      token: authToken,
      user: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department,
        designation: employee.designation,
        role: employee.role,
        status: employee.status
      }
    });
  } catch (error) {
    console.error('Employee registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/employees/verify-invite/:token
// @desc    Verify invitation token
// @access  Public
router.get('/verify-invite/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Hash the token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find employee with this token
    const employee = await Employee.findOne({
      'invitation.tokenHash': tokenHash,
      'invitation.status': 'invited',
      'invitation.expiresAt': { $gt: new Date() }
    })
    .populate('department', 'name')
    .populate('organization', 'name email');

    if (!employee) {
      return res.status(400).json({ message: 'Invalid or expired invitation token' });
    }

    res.json({
      valid: true,
      employee: {
        name: employee.name,
        email: employee.email,
        designation: employee.designation,
        department: employee.department
      },
      organization: employee.organization
    });
  } catch (error) {
    console.error('Verify invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/employees/verify-code
// @desc    Verify invitation code
// @access  Public
router.post('/verify-code', async (req, res) => {
  console.log('🚀 POST /api/employees/verify-code endpoint hit!');
  try {
    const { code } = req.body;
    console.log('🔍 Verify code request received:', { code, body: req.body });

    if (!code) {
      return res.status(400).json({ message: 'Invitation code is required' });
    }

    // Find employee by invitation code (first 8 characters of tokenHash) - case insensitive
    const employee = await Employee.findOne({
      'invitation.tokenHash': { $regex: `^${code}`, $options: 'i' },
      'invitation.status': 'invited',
      'invitation.acceptedAt': null
    });

    if (!employee) {
      return res.status(400).json({ message: 'Invalid or expired invitation code' });
    }

    res.json({
      valid: true,
      employee: {
        name: employee.name,
        email: employee.email,
        designation: employee.designation,
        department: employee.department
      },
      organization: { name: 'Test Organization' }
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/employees/register-with-code
// @desc    Register employee with invitation code
// @access  Public
router.post('/register-with-code', async (req, res) => {
  try {
    const {
      inviteCode,
      email,
      name,
      password,
      dateOfBirth,
      gender,
      profileImage
    } = req.body;

    // Validate required fields
    if (!inviteCode || !email || !name || !password || !dateOfBirth || !gender) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find employee by invitation code (case insensitive)
    console.log('🔍 Register with code - searching for:', inviteCode);
    const employee = await Employee.findOne({
      'invitation.tokenHash': { $regex: `^${inviteCode}`, $options: 'i' },
      'invitation.status': 'invited',
      'invitation.acceptedAt': null
    });
    console.log('🔍 Found employee:', employee ? 'Yes' : 'No');

    if (!employee) {
      return res.status(400).json({ message: 'Invalid or expired invitation code' });
    }

    // Check if email matches
    if (employee.email !== email) {
      return res.status(400).json({ message: 'Email does not match invitation' });
    }

    // Update employee with registration details
    employee.password = password; // Will be hashed by pre-save hook
    employee.status = 'active';
    employee.registeredAt = new Date();
    employee.gender = gender;
    
    // Update profile fields
    if (!employee.profile) {
      employee.profile = {};
    }
    employee.profile.dateOfBirth = dateOfBirth;
    employee.profile.profilePhoto = profileImage;
    
    const updatedEmployee = await employee.save();

    // Update invitation status in employee record
    await Employee.findByIdAndUpdate(employee._id, {
      'invitation.status': 'accepted',
      'invitation.acceptedAt': new Date()
    });

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: updatedEmployee._id,
        email: updatedEmployee.email,
        organization: updatedEmployee.organization
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Registration successful',
      token,
      user: {
        _id: updatedEmployee._id,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        employeeId: updatedEmployee.employeeId,
        department: updatedEmployee.department,
        designation: updatedEmployee.designation,
        role: updatedEmployee.role,
        status: updatedEmployee.status
      }
    });
  } catch (error) {
    console.error('Register with code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/employees/profile
// @desc    Get employee profile with organization settings
// @access  Private (Employee)
router.get('/profile', auth, async (req, res) => {
  try {
    const Organization = require('../models/Organization');
    
    // Get employee with populated department
    const employee = await Employee.findById(req.user._id)
      .populate('department', 'name')
      .select('-password -invitation.tokenHash');
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Get organization settings for auto check-in
    const organization = await Organization.findById(employee.organization);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Return employee profile with organization settings
    res.json({
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department,
        designation: employee.designation,
        role: employee.role,
        status: employee.status,
        lastLogin: employee.lastLogin
      },
      organizationSettings: {
        companyLocation: organization.settings?.companyLocation || { enabled: false },
        companyWifi: organization.settings?.companyWifi || { enabled: false, networks: [] },
        autoCheckInWindow: organization.settings?.autoCheckInWindow || 90,
        workingHours: organization.settings?.workingHours,
        timezone: organization.settings?.timezone
      }
    });
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/employees/organization-settings
// @desc    Get organization settings for employee (auto check-in configuration)
// @access  Private (Employee)
router.get('/organization-settings', auth, async (req, res) => {
  try {
    const Organization = require('../models/Organization');
    
    // Get employee's organization
    const employee = await Employee.findById(req.user._id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Get organization settings
    const organization = await Organization.findById(employee.organization);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Return only the settings needed for auto check-in (no sensitive data)
    res.json({
      companyLocation: organization.settings.companyLocation || { enabled: false },
      companyWifi: organization.settings.companyWifi || { enabled: false, networks: [] },
      autoCheckInWindow: organization.settings.autoCheckInWindow || 90,
      workingHours: organization.settings.workingHours,
      timezone: organization.settings.timezone
    });
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;



