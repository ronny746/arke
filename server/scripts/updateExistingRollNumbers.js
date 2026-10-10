require('dotenv').config();
const connectDB = require('../config/db');
const UserModel = require('../modules/users/users.model');
const { generateUniqueRandomRollNo } = require('../utils/rollNoGenerator');

async function migrateRollNumbers() {
  try {
    await connectDB();
    console.log('🔄 Fetching all student records...');

    const students = await UserModel.find({
      role: { $in: ['STUDENT', 'student'] }
    });

    console.log(`📊 Found ${students.length} student records.`);

    let updatedCount = 0;

    for (const student of students) {
      const currentRoll = student.metadata?.rollNo;
      
      // Update if rollNo is missing, starts with ARKE, or isn't formatted as RK + 3-digits
      const needsUpdate = !currentRoll || /^ARKE/i.test(currentRoll) || !/^RK\d{3,4}$/i.test(currentRoll);

      if (needsUpdate) {
        const newRollNo = await generateUniqueRandomRollNo(student.instituteId, 'RK');
        student.metadata = student.metadata || {};
        student.metadata.rollNo = newRollNo;

        // Force mark metadata as modified in Mongoose for Mixed type
        student.markModified('metadata');
        await student.save();
        
        console.log(`✅ Updated Student: ${student.firstName} ${student.lastName || ''} (${student.email || student.phone}) ➔ Roll No: ${newRollNo}`);
        updatedCount++;
      } else {
        console.log(`ℹ️ Student already has RK Roll No: ${student.firstName} ${student.lastName || ''} ➔ Roll No: ${currentRoll}`);
      }
    }

    console.log(`\n🎉 Migration Complete! Updated ${updatedCount} / ${students.length} students to RK Roll Numbers.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  }
}

migrateRollNumbers();
