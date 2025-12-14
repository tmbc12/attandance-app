const mongoose = require('mongoose');
const Organization = require('../models/Organization');
require('dotenv').config();

const verifyOrganization = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://192.168.31.75:27017/tmbc-attendance');

    console.log('🔍 Checking organization accounts...\n');

    const organizations = await Organization.find().select('-password -__v');

    if (organizations.length === 0) {
      console.log('❌ No organization accounts found!');
      console.log('💡 Run: npm run setup:org');
    } else {
      console.log(`✅ Found ${organizations.length} organization(s):\n`);
      organizations.forEach((org, index) => {
        console.log(`Organization #${index + 1}:`);
        console.log('  Name:', org.name);
        console.log('  Email:', org.email);
        console.log('  Role:', org.role);
        console.log('  Active:', org.isActive);
        console.log('  Permissions:', org.permissions.join(', '));
        console.log('  Created:', org.createdAt);
        console.log('');
      });
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

verifyOrganization();


