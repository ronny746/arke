const mongoose = require('mongoose');
const env = require('./server/config/env');
const BatchModel = require('./server/modules/batches/batches.model');
const UserModel = require('./server/modules/users/users.model');

async function run() {
  await mongoose.connect(env.mongodb.uri);
  const user = await UserModel.findOne({ role: 'student' }).sort({ createdAt: -1 });
  if (!user) { console.log('No student found'); process.exit(1); }
  
  const batches = await BatchModel.find({ students: user._id }).populate('courseId');
  console.log('Student:', user.firstName, user.phone);
  console.log('Batches:', batches.length);
  batches.forEach(b => {
    console.log('- Batch:', b.name, 'Course:', b.courseId ? b.courseId.name : 'null');
  });
  
  process.exit(0);
}
run();
