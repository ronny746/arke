const mongoose = require('mongoose');
const BatchModel = require('./server/modules/batches/batches.model');
const UserModel = require('./server/modules/users/users.model');

async function run() {
  const MONGODB_URI = "mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsluck?appName=Cluster0";
  await mongoose.connect(MONGODB_URI);
  
  const user = await UserModel.findOne({ role: 'student' }).sort({ createdAt: -1 });
  console.log('Student:', user.firstName, user.phone, user._id);
  
  const batchesByStudent = await BatchModel.find({ students: user._id }).populate('courseId');
  console.log('Batches with this student:', batchesByStudent.length);
  
  const allBatches = await BatchModel.find();
  console.log('Total batches in DB:', allBatches.length);
  allBatches.forEach(b => {
    console.log('Batch:', b.name, 'CourseId:', b.courseId, 'Students count:', b.students.length);
    if(b.students.includes(user._id)) console.log(' -> contains student');
  });
  
  process.exit(0);
}
run();
