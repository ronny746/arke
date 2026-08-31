const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsluck?appName=Cluster0";

async function run() {
  await mongoose.connect(MONGODB_URI);
  
  const Batch = mongoose.model('Batch', new mongoose.Schema({}, { strict: false }));
  const batches = await Batch.find({});
  console.log('Batches length:', batches.length);
  for (let b of batches) {
    console.log('Batch ID:', b._id, 'CourseID:', b.courseId, 'Students:', b.students?.length);
  }
  
  const FeeRecord = mongoose.model('FeeRecord', new mongoose.Schema({}, { strict: false }));
  const records = await FeeRecord.find({});
  console.log('Fee records:', records.length);
  for (let r of records) {
    console.log('Record ID:', r._id, 'StudentId:', r.studentId, 'Type:', r.feeType);
  }
  
  process.exit(0);
}
run();
