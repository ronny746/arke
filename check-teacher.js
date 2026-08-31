require('dotenv').config();
const mongoose = require('mongoose');
const Batch = require('./server/modules/batches/batches.model');
const ClassSchedule = require('./server/modules/classes-schedule/classes-schedule.model');
const User = require('./server/modules/users/users.model');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const teacher = await User.findOne({ role: 'teacher' });
  if (!teacher) return console.log('No teacher found');
  
  const batches = await Batch.find({ batchTeacherId: teacher._id });
  const schedules = await ClassSchedule.find({ teacherId: teacher._id });
  
  console.log('Teacher:', teacher.name, teacher.email);
  console.log('Batches assigned:', batches.length);
  console.log('Schedules assigned:', schedules.length);
  process.exit();
});
