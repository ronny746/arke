const mongoose = require('mongoose');
const uri = 'mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsarke?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const banks = await db.collection('questionbanks').find({}).toArray();
  console.log("QuestionBanks instituteIds:");
  banks.forEach(b => console.log(b._id, b.institute));

  const student = await db.collection('users').findOne({ role: 'student' });
  console.log("Student instituteId:", student.instituteId);

  process.exit(0);
}
run();
