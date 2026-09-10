const mongoose = require('mongoose');
const uri = 'mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsarke?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const banks = await db.collection('questionbanks').find({ "questions.0": { $exists: true } }).toArray();
  
  console.log("Found", banks.length, "banks with questions");
  
  if (banks.length > 0) {
    console.log("Total questions in first bank:", banks[0].questions.length);
    console.log("Sample question:", banks[0].questions[0].subjectName, banks[0].questions[0].chapterName, banks[0].questions[0].topicName);
  }

  process.exit(0);
}

run().catch(console.error);
