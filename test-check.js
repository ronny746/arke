const mongoose = require('mongoose');
const env = require('./server/config/env');
const BatchModel = require('./server/modules/batches/batches.model');
const CourseModel = require('./server/modules/courses/courses.model');

async function check() {
  await mongoose.connect(env.MONGODB_URI);
  const batches = await BatchModel.find().populate('students');
  console.log('Batches:', batches.map(b => ({
    id: b._id,
    courseId: b.courseId,
    students: b.students.map(s => s.email)
  })));
  
  const records = await require('./server/modules/fees-payments/fees-payments.model').FeeRecord.find();
  console.log('Fee Records count:', records.length);
  process.exit(0);
}
require('dotenv').config();
check();
