const mongoose = require('mongoose');
const uri = 'mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsarke?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const result = await db.collection('questionbanks').findOne({});
  
  if (result) {
    console.log("Found:", result.questions.length, "questions in first bank");
    if(result.questions.length > 0) {
      console.log("First question subjectName:", result.questions[0].subjectName);
    }
  }

  process.exit(0);
}

run().catch(console.error);
