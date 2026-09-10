const mongoose = require('mongoose');
const uri = 'mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsarke?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const student = await db.collection('users').findOne({ role: 'student' });
  if (!student) {
    console.log("No student found");
    process.exit(0);
  }
  console.log("Found student:", student.name, student._id);

  const instituteId = student.instituteId;

  // Let's create a dummy DPP session
  const dpp = {
    student: student._id,
    institute: instituteId,
    sessionType: 'DPP',
    title: 'DPP - Mixed (Created via Script)',
    filters: { subject: '', topic: '', difficulty: '' },
    status: 'IN_PROGRESS',
    totalQuestions: 2,
    totalMarks: 8,
    score: 0,
    questions: [
      {
        questionId: 'q1',
        questionText: 'Test Question 1',
        type: 'MCQ',
        difficulty: 'Medium',
        marks: 4,
        negativeMarks: 1,
        options: [
          { _id: new mongoose.Types.ObjectId().toString(), text: 'Option A', isCorrect: true },
          { _id: new mongoose.Types.ObjectId().toString(), text: 'Option B', isCorrect: false }
        ],
        explanation: 'Test Explanation 1'
      },
      {
        questionId: 'q2',
        questionText: 'Test Question 2',
        type: 'MCQ',
        difficulty: 'Medium',
        marks: 4,
        negativeMarks: 1,
        options: [
          { _id: new mongoose.Types.ObjectId().toString(), text: 'Option C', isCorrect: true },
          { _id: new mongoose.Types.ObjectId().toString(), text: 'Option D', isCorrect: false }
        ],
        explanation: 'Test Explanation 2'
      }
    ],
    answers: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection('practicesessions').insertOne(dpp);
  console.log("Created dummy DPP session");

  process.exit(0);
}

run().catch(console.error);
