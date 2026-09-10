const mongoose = require('mongoose');
const uri = 'mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsarke?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const result = await db.collection('questionbanks').updateMany(
    { "questions.subjectName": { $in: [null, ""] } },
    { $set: { "questions.$[elem].subjectName": "General" } },
    { arrayFilters: [{ "elem.subjectName": { $in: [null, ""] } }] }
  );
  
  console.log("Updated subjectName:", result.modifiedCount);

  const result2 = await db.collection('questionbanks').updateMany(
    { "questions.chapterName": { $in: [null, ""] } },
    { $set: { "questions.$[elem].chapterName": "General" } },
    { arrayFilters: [{ "elem.chapterName": { $in: [null, ""] } }] }
  );
  
  console.log("Updated chapterName:", result2.modifiedCount);

  const result3 = await db.collection('questionbanks').updateMany(
    { "questions.topicName": { $in: [null, ""] } },
    { $set: { "questions.$[elem].topicName": "General" } },
    { arrayFilters: [{ "elem.topicName": { $in: [null, ""] } }] }
  );
  
  console.log("Updated topicName:", result3.modifiedCount);

  process.exit(0);
}

run().catch(console.error);
