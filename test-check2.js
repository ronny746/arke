const mongoose = require('mongoose');
require('dotenv').config();
const env = require('./server/config/env');
const BatchModel = require('./server/modules/batches/batches.model');
const CourseModel = require('./server/modules/courses/courses.model');
const { FeeRecord } = require('./server/modules/fees-payments/fees-payments.model');

async function check() {
  await mongoose.connect(env.MONGODB_URI);
  const batches = await BatchModel.find().populate('students');
  console.log('Batches:', batches.map(b => ({
    id: b._id,
    courseId: b.courseId,
    students: b.students.map(s => s.email || s.phone)
  })));
  
  const records = await FeeRecord.find();
  console.log('Fee Records:', records.map(r => ({ studentId: r.studentId })));
  
  process.exit(0);
}
check();
