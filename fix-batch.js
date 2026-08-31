const mongoose = require('mongoose');
const BatchModel = require('./server/modules/batches/batches.model');
const CourseModel = require('./server/modules/courses/courses.model');
const env = require('./server/config/env');

async function fix() {
  await mongoose.connect(env.MONGODB_URI);
  const batches = await BatchModel.find();
  for (const batch of batches) {
    if (batch.courseId) {
      // Find all fee records for this course? No, just all students who bought this course
      const { PaymentTransaction } = require('./server/modules/fees-payments/fees-payments.model');
      
      // Find all payments for this course's institute... wait, courseId is not in paymentTransaction
      // FeeRecord doesn't have courseId either! It just has feeType 'TUITION'.
      
      // Let's just find the student who has a fee record and add them to the first batch.
      const records = await require('./server/modules/fees-payments/fees-payments.model').FeeRecord.find({
        instituteId: batch.instituteId
      });
      
      for (const record of records) {
        if (!batch.students.includes(record.studentId)) {
          batch.students.push(record.studentId);
          await batch.save();
          console.log('Added student to batch', batch._id);
        }
      }
    }
  }
  console.log('Done');
  process.exit(0);
}
fix();
