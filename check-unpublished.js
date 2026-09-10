const mongoose = require('mongoose');
const uri = 'mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsarke?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const banks = await db.collection('questionbanks').find({}).toArray();
  const allQuestions = banks.flatMap(b => b.questions || []);
  const unpublished = allQuestions.filter(q => q.isUnpublished === true).length;
  const published = allQuestions.filter(q => q.isUnpublished !== true).length;

  console.log("Unpublished questions:", unpublished);
  console.log("Published questions:", published);

  process.exit(0);
}
run();
