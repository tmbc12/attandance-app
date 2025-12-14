const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
require('dotenv').config();

async function seedOrganization() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://192.168.31.75:27017/tmbc-attendance');
    console.log('Connected to MongoDB');

    // Create organization
    let organization = await Organization.findOne({ email: 'admin@tmbc.com' });

    if (!organization) {
      organization = new Organization({
        name: 'Teambo',
        email: 'admin@tmbc.com',
        phone: '+1234567890',
        address: {
          city: 'New York',
          state: 'NY',
          country: 'USA'
        }
      });
      await organization.save();
      console.log('Organization created:', organization.name);
    } else {
      console.log('Organization already exists:', organization.name);
    }

    // Create default departments
    const defaultDepartments = [
      { name: 'Engineering', description: 'Software development and engineering' },
      { name: 'Marketing', description: 'Marketing and communications' },
      { name: 'Sales', description: 'Sales and business development' },
      { name: 'HR', description: 'Human resources' },
      { name: 'Finance', description: 'Finance and accounting' },
      { name: 'Operations', description: 'Operations and logistics' },
      { name: 'Customer Support', description: 'Customer service and support' }
    ];

    for (const dept of defaultDepartments) {
      const existing = await Department.findOne({
        organization: organization._id,
        name: dept.name
      });

      if (!existing) {
        const department = new Department({
          organization: organization._id,
          ...dept
        });
        await department.save();
        console.log('Department created:', dept.name);
      }
    }

    // Update existing employees with organization and department references
    const employees = await Employee.find({});
    const departments = await Department.find({ organization: organization._id });

    for (const employee of employees) {
      if (!employee.organization) {
        employee.organization = organization._id;

        // Find matching department by name
        if (typeof employee.department === 'string') {
          const dept = departments.find(d =>
            d.name.toLowerCase() === employee.department.toLowerCase()
          );
          if (dept) {
            employee.department = dept._id;
          }
        }

        await employee.save();
        console.log('Employee updated:', employee.name);
      }
    }

    console.log('Organization seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding organization:', error);
    process.exit(1);
  }
}

seedOrganization();
