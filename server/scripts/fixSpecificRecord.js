const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
require('dotenv').config();

async function fixSpecificRecord() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://192.168.31.75:27017/attendance-app');
    console.log('✅ Connected to MongoDB');

    // Find the problematic record
    const record = await Attendance.findOne({
      'checkIn.time': { $exists: true },
      'checkOut.time': { $exists: true }
    }).sort({ date: -1 }).populate('employee', 'name email');

    if (!record) {
      console.log('No records found');
      await mongoose.connection.close();
      return;
    }

    console.log('\n📊 Current Record:');
    console.log('Date:', record.date);
    console.log('Check In:', record.checkIn.time);
    console.log('Check Out:', record.checkOut.time);
    console.log('Working Hours:', record.workingHours);

    // Fix the checkout time - subtract 24 hours
    const checkOutTime = new Date(record.checkOut.time);
    checkOutTime.setHours(checkOutTime.getHours() - 24);

    console.log('\n✅ Fixed Check Out:', checkOutTime);

    // Calculate correct working hours
    const checkInTime = new Date(record.checkIn.time);
    const diffMs = checkOutTime - checkInTime;
    const correctHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

    console.log('Correct Working Hours:', correctHours);

    // Update the record
    record.checkOut.time = checkOutTime;
    record.workingHours = correctHours;

    await record.save();

    console.log('\n✅ Record updated successfully!');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

fixSpecificRecord();
