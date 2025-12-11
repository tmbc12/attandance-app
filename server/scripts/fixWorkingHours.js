const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
require('dotenv').config();

async function fixWorkingHours() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-app');
    console.log('✅ Connected to MongoDB');

    // Get all attendance records with both check-in and check-out
    const records = await Attendance.find({
      'checkIn.time': { $exists: true },
      'checkOut.time': { $exists: true }
    });

    console.log(`📊 Found ${records.length} records to process`);

    let fixed = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const checkInTime = new Date(record.checkIn.time);
        const checkOutTime = new Date(record.checkOut.time);
        const diffMs = checkOutTime - checkInTime;
        const correctHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

        if (record.workingHours !== correctHours) {
          console.log(`\n🔧 Fixing record ${record._id}:`);
          console.log(`   Date: ${record.date}`);
          console.log(`   Check In: ${checkInTime}`);
          console.log(`   Check Out: ${checkOutTime}`);
          console.log(`   Old Hours: ${record.workingHours}`);
          console.log(`   New Hours: ${correctHours}`);

          record.workingHours = correctHours;
          await record.save();
          fixed++;
        }
      } catch (error) {
        console.error(`❌ Error fixing record ${record._id}:`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Fix completed!');
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${records.length}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

fixWorkingHours();
