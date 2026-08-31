require('dotenv').config();
const mongoose = require('mongoose');
const ClassSchedule = require('./server/modules/classes-schedule/classes-schedule.model');
const User = require('./server/modules/users/users.model');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const teacher = await User.findOne({ email: 'developer.abhishek.0929@gmail.com' });
  if (!teacher) return console.log('No teacher found');
  
  const schedules = await ClassSchedule.find({ teacherId: teacher._id });
  
  console.log('Teacher:', teacher.firstName, teacher.lastName, teacher._id);
  console.log('Schedules assigned:', schedules.length);
  process.exit();
});
