const mongoose = require('mongoose');
const BatchModel = require('./server/modules/batches/batches.model');
const UserModel = require('./server/modules/users/users.model');
const CourseModel = require('./server/modules/courses/courses.model');

async function run() {
  const MONGODB_URI = "mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsluck?appName=Cluster0";
  await mongoose.connect(MONGODB_URI);
  
  const user = await UserModel.findOne({ role: 'student' }).sort({ createdAt: -1 });
  console.log('Student:', user.firstName, user._id);
  
  const allBatches = await BatchModel.find();
  console.log('Total batches in DB:', allBatches.length);
  for(let b of allBatches) {
    const course = b.courseId ? await CourseModel.findById(b.courseId) : null;
    console.log('Batch:', b.name, 'Course:', course ? course.name : 'null', 'Students:', b.students.length);
    if(b.students.some(s => s.toString() === user._id.toString())) console.log(' -> contains student');
  }
  
  process.exit(0);
}
run();
