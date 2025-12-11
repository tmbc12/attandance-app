const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const { auth } = require('../middleware/auth');

// Get all departments
router.get('/', auth, async (req, res) => {
  try {
    const departments = await Department.find({
      organization: req.user._id,
      isActive: true
    })
    .populate('manager', 'name email')
    .sort({ name: 1 });

    // Get employee count for each department
    const departmentsWithCount = await Promise.all(
      departments.map(async (dept) => {
        const employeeCount = await Employee.countDocuments({
          department: dept._id,
          status: { $in: ['active', 'pending'] }
        });
        return {
          ...dept.toObject(),
          employeeCount
        };
      })
    );

    res.json(departmentsWithCount);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Error fetching departments', error: error.message });
  }
});

// Get single department
router.get('/:id', auth, async (req, res) => {
  try {
    const department = await Department.findOne({
      _id: req.params.id,
      organization: req.user._id
    }).populate('manager', 'name email');

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const employeeCount = await Employee.countDocuments({
      department: department._id,
      status: { $in: ['active', 'pending'] }
    });

    res.json({
      ...department.toObject(),
      employeeCount
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ message: 'Error fetching department', error: error.message });
  }
});

// Create new department
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, manager, colorCode } = req.body;

    // Check if department with same name exists
    const existing = await Department.findOne({
      organization: req.user._id,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true
    });

    if (existing) {
      return res.status(400).json({ message: 'Department with this name already exists' });
    }

    const department = new Department({
      organization: req.user._id,
      name,
      description,
      colorCode,
      manager
    });

    await department.save();
    res.status(201).json(department);
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ message: 'Error creating department', error: error.message });
  }
});

// Update department
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, manager, colorCode } = req.body;

    const department = await Department.findOne({
      _id: req.params.id,
      organization: req.user._id
    });

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if new name conflicts with existing department
    if (name && name !== department.name) {
      const existing = await Department.findOne({
        organization: req.user._id,
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        isActive: true,
        _id: { $ne: req.params.id }
      });

      if (existing) {
        return res.status(400).json({ message: 'Department with this name already exists' });
      }
    }

    if (name) department.name = name;
    if (description !== undefined) department.description = description;
    if (manager !== undefined) department.manager = manager;
    if (colorCode !== undefined) department.colorCode = colorCode;

    await department.save();
    res.json(department);
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ message: 'Error updating department', error: error.message });
  }
});

// Delete department (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const department = await Department.findOne({
      _id: req.params.id,
      organization: req.user._id
    });

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if department has employees
    const employeeCount = await Employee.countDocuments({
      department: department._id,
      status: { $in: ['active', 'pending'] }
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        message: `Cannot delete department. ${employeeCount} employee(s) are assigned to this department.`
      });
    }

    department.isActive = false;
    await department.save();

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ message: 'Error deleting department', error: error.message });
  }
});

module.exports = router;
