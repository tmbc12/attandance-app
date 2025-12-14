const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
require('dotenv').config();

async function debugAttendance() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://192.168.31.75:27017/attendance-app');
    console.log('✅ Connected to MongoDB');

    // Get the most recent attendance record
    const record = await Attendance.findOne({
      'checkIn.time': { $exists: true },
      'checkOut.time': { $exists: true }
    }).sort({ date: -1 }).populate('employee', 'name email');

    if (!record) {
      console.log('No records found');
      await mongoose.connection.close();
      return;
    }

    console.log('\n📊 Latest Attendance Record:');
    console.log('='.repeat(50));
    console.log(`Employee: ${record.employee.name} (${record.employee.email})`);
    console.log(`Date: ${record.date}`);
    console.log(`\nCheck In:`);
    console.log(`  Time: ${record.checkIn.time}`);
    console.log(`  ISO: ${new Date(record.checkIn.time).toISOString()}`);
    console.log(`\nCheck Out:`);
    console.log(`  Time: ${record.checkOut.time}`);
    console.log(`  ISO: ${new Date(record.checkOut.time).toISOString()}`);

    const checkInTime = new Date(record.checkIn.time);
    const checkOutTime = new Date(record.checkOut.time);
    const diffMs = checkOutTime - checkInTime;
    const diffMinutes = diffMs / (1000 * 60);
    const diffHours = diffMs / (1000 * 60 * 60);

    console.log(`\n⏱️  Time Calculations:`);
    console.log(`  Difference (ms): ${diffMs}`);
    console.log(`  Difference (minutes): ${diffMinutes.toFixed(2)}`);
    console.log(`  Difference (hours): ${diffHours.toFixed(2)}`);
    console.log(`  Stored workingHours: ${record.workingHours}`);

    console.log(`\n📝 Other Fields:`);
    console.log(`  Status: ${record.status}`);
    console.log(`  Is Late: ${record.isLate}`);
    console.log(`  Late By: ${record.lateBy} minutes`);
    console.log(`  Overtime: ${record.overtime} minutes`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

debugAttendance();
