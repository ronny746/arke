const mongoose = require('mongoose');
const uri = 'mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsarke?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const result = await db.collection('questionbanks').updateMany(
    { $or: [
        { "questions.subjectName": { $in: [null, ""] } },
        { "questions.subjectName": { $exists: false } }
    ]},
    { $set: { "questions.$[elem].subjectName": "General" } },
    { arrayFilters: [{ $or: [{ "elem.subjectName": { $in: [null, ""] } }, { "elem.subjectName": { $exists: false } }] }] }
  );
  
  console.log("Updated subjectName with exists:", result.modifiedCount);

  process.exit(0);
}

run().catch(console.error);
