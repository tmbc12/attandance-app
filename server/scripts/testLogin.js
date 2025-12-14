const axios = require('axios');
require('dotenv').config();

const testLogin = async () => {
  try {
    const email = process.env.FIRST_ADMIN_EMAIL || 'admin@tmbc.com';
    const password = process.env.FIRST_ADMIN_PASSWORD || 'Admin@123456';
    const serverUrl = `http://192.168.31.75:${process.env.PORT || 5000}`;

    console.log('🧪 Testing Organization Login...\n');
    console.log('Server URL:', serverUrl);
    console.log('Email:', email);
    console.log('Password:', '***********');
    console.log('');

    const response = await axios.post(`${serverUrl}/api/auth/login`, {
      email,
      password
    });

    if (response.data.token) {
      console.log('✅ Login Successful!\n');
      console.log('Token:', response.data.token.substring(0, 20) + '...');
      console.log('\nOrganization Info:');
      console.log('  Name:', response.data.organization.name);
      console.log('  Email:', response.data.organization.email);
      console.log('  Role:', response.data.organization.role);
      console.log('  Permissions:', response.data.organization.permissions.join(', '));
      console.log('\n✅ Authentication is working correctly!');
    }

  } catch (error) {
    console.error('❌ Login Failed!\n');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data.message);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Cannot connect to server.');
      console.error('Make sure the server is running: npm run dev');
    } else {
      console.error('Error:', error.message);
    }
  }
};

testLogin();


