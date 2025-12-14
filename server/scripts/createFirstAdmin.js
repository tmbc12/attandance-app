const mongoose = require('mongoose');
const Organization = require('../models/Organization');
require('dotenv').config();

const createFirstOrganization = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://192.168.31.75:27017/tmbc-attendance');

    console.log('🔍 Checking for existing organization...');
    const orgCount = await Organization.countDocuments();

    if (orgCount === 0) {
      const email = process.env.FIRST_ADMIN_EMAIL || 'admin@tmbc.com';
      const password = process.env.FIRST_ADMIN_PASSWORD || 'Admin@123456';

      const organization = await Organization.create({
        name: 'Teambo',
        email: email,
        password: password, // Will be hashed by pre-save hook
        phone: '+1234567890',
        address: {
          city: 'New York',
          state: 'NY',
          country: 'USA'
        },
        role: 'super_admin',
        permissions: [
          'manage_employees',
          'manage_invites',
          'view_reports',
          'manage_settings',
          'bulk_operations'
        ],
        isActive: true
      });

      console.log('✅ First organization created successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email:', email);
      console.log('🔑 Password:', password);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  IMPORTANT: Please change the password after first login!');
      console.log('🌐 Login at: http://192.168.31.75:3000/auth/login');
    } else {
      console.log('ℹ️  Organization already exists. Skipping creation.');
      const existingOrg = await Organization.findOne().select('name email role');
      console.log('📧 Existing organization:', existingOrg.email);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating organization:', error.message);
    process.exit(1);
  }
};

createFirstOrganization();


