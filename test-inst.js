const mongoose = require('mongoose');
const UserModel = require('./server/modules/users/users.model');
const BatchModel = require('./server/modules/batches/batches.model');

async function run() {
  const MONGODB_URI = "mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsluck?appName=Cluster0";
  await mongoose.connect(MONGODB_URI);
  const student = await UserModel.findOne({ phone: '9473958898' });
  const batch = await BatchModel.findOne({ students: student._id });
  
  console.log('Student instId:', student.instituteId);
  console.log('Batch instId:', batch.instituteId);
  process.exit(0);
}
run();
