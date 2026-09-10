const mongoose = require('mongoose');
const uri = 'mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsarke?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const result = await db.collection('practicesessions').deleteMany({ sessionType: 'DPP' });
  console.log("Deleted DPPs:", result.deletedCount);

  process.exit(0);
}
run();
