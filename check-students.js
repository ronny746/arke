const mongoose = require('mongoose');
const UserModel = require('./server/modules/users/users.model');
const BatchModel = require('./server/modules/batches/batches.model');

async function run() {
  const MONGODB_URI = "mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsluck?appName=Cluster0";
  await mongoose.connect(MONGODB_URI);
  
  const students = await UserModel.find({ role: 'student' }).sort({ createdAt: -1 });
  console.log(`Found ${students.length} students`);
  for (let s of students) {
    const batches = await BatchModel.find({ students: s._id });
    console.log(`Student: ${s.firstName} ${s.lastName} (ID: ${s._id}, Phone: ${s.phone}) -> Batches: ${batches.length}`);
  }
  
  process.exit(0);
}
run();
