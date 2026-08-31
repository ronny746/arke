const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsluck?appName=Cluster0";

async function run() {
  await mongoose.connect(MONGODB_URI);
  
  const Batch = mongoose.model('Batch', new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    students: [{ type: mongoose.Schema.Types.ObjectId }]
  }, { strict: false }));
  
  const batches = await Batch.find({ students: '6a744777887ec317762bb0ba' });
  console.log('User batches count:', batches.length);
  for (let b of batches) {
    console.log('Batch courseId:', b.courseId);
  }
  process.exit(0);
}
run();
