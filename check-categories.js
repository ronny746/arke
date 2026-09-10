const mongoose = require('mongoose');
const uri = 'mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsarke?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const categories = await db.collection('questioncategories').find({}).toArray();
  console.log("Categories:", categories.map(c => c.name));

  process.exit(0);
}
run();
