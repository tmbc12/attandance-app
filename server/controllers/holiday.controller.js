const Holiday = require('../models/holidayModel');
const Employee = require('../models/Employee');

// Get all holidays for an organization
exports.getHolidays = async (req, res) => {
  try {
    const { year, month } = req.query;
    const organizationId = req.user._id;

    // Build query
    const query = { organizationId };

    // Filter by year if provided
    if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Filter by month if provided
    if (month) {
      const yearValue = year || new Date().getFullYear();
      const startDate = new Date(yearValue, month - 1, 1);
      const endDate = new Date(yearValue, month, 0, 23, 59, 59);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const holidays = await Holiday.find(query)
      .populate('createdBy', 'name email')
      .sort({ date: 1 });

    res.json(holidays);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ message: 'Error fetching holidays', error: error.message });
  }
};

// Get a single holiday
exports.getHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findOne({
      _id: req.params.id,
      organizationId: req.user._id
    }).populate('createdBy', 'name email');

    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    res.json(holiday);
  } catch (error) {
    console.error('Error fetching holiday:', error);
    res.status(500).json({ message: 'Error fetching holiday', error: error.message });
  }
};

// Create a new holiday
exports.createHoliday = async (req, res) => {
  try {
    const { date, description } = req.body;
    const organizationId = req.user._id;

    // Validate required fields
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    // Check if user is admin/organization (not employee)
    // Employees have 'status' field, organizations have 'role' or 'permissions'
    const isEmployee = req.user.status && !req.user.role;
    
    if (isEmployee) {
      return res.status(403).json({ message: 'Only admins can create holidays' });
    }

    // Get employee ID for createdBy
    // For organization/admin users, find the first active employee of the organization
    // This represents the admin who created the holiday
    let createdBy = null;
    
    const adminEmployee = await Employee.findOne({
      organization: organizationId,
      status: 'active'
    }).sort({ createdAt: 1 }); // Get the first employee (likely the admin)
    
    if (!adminEmployee) {
      return res.status(400).json({ message: 'No active employees found in organization' });
    }
    
    createdBy = adminEmployee._id;

    // Check if holiday already exists for this date and organization
    const existingHoliday = await Holiday.findOne({
      organizationId,
      date: new Date(date)
    });

    if (existingHoliday) {
      return res.status(400).json({ message: 'Holiday already exists for this date' });
    }

    const holiday = new Holiday({
      date: new Date(date),
      description,
      organizationId,
      createdBy
    });

    await holiday.save();
    
    const populatedHoliday = await Holiday.findById(holiday._id)
      .populate('createdBy', 'name email');

    res.status(201).json(populatedHoliday);
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({ message: 'Error creating holiday', error: error.message });
  }
};

// Update a holiday
exports.updateHoliday = async (req, res) => {
  try {
    const { date, description } = req.body;

    // Check if user is admin/organization (not employee)
    if (!req.user.permissions && !req.user.role) {
      return res.status(403).json({ message: 'Only admins can update holidays' });
    }

    const holiday = await Holiday.findOne({
      _id: req.params.id,
      organizationId: req.user._id
    });

    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    // Check if new date conflicts with existing holiday
    if (date && new Date(date).getTime() !== holiday.date.getTime()) {
      const existingHoliday = await Holiday.findOne({
        organizationId: req.user._id,
        date: new Date(date),
        _id: { $ne: req.params.id }
      });

      if (existingHoliday) {
        return res.status(400).json({ message: 'Holiday already exists for this date' });
      }
    }

    if (date) holiday.date = new Date(date);
    if (description !== undefined) holiday.description = description;

    await holiday.save();
    
    const populatedHoliday = await Holiday.findById(holiday._id)
      .populate('createdBy', 'name email');

    res.json(populatedHoliday);
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(500).json({ message: 'Error updating holiday', error: error.message });
  }
};

// Delete a holiday
exports.deleteHoliday = async (req, res) => {
  try {
    // Check if user is admin/organization (not employee)
    if (!req.user.permissions && !req.user.role) {
      return res.status(403).json({ message: 'Only admins can delete holidays' });
    }

    const holiday = await Holiday.findOne({
      _id: req.params.id,
      organizationId: req.user._id
    });

    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    await Holiday.findByIdAndDelete(req.params.id);

    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ message: 'Error deleting holiday', error: error.message });
  }
};

