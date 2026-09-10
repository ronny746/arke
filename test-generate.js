const mongoose = require('mongoose');
const PracticeSession = require('./server/modules/practice/practice-session.model');
const QuestionBank = require('./server/modules/exams/question-bank.model');
const Institute = require('./server/modules/institute/institute.model');
const User = require('./server/modules/users/user.model');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/lms_db', { useNewUrlParser: true, useUnifiedTopology: true });
  
  const institute = await Institute.findOne();
  if (!institute) return console.log("No institute");
  
  const student = await User.findOne({ role: 'student', instituteId: institute._id });
  if (!student) return console.log("No student");

  // Mock req and res
  const req = {
    user: { instituteId: institute._id.toString(), userId: student._id.toString() },
    body: {
      sessionType: 'DPP',
      numberOfQuestions: 2
    }
  };
  
  const res = {
    status: (code) => ({
      json: (data) => console.log(code, data)
    })
  };
  
  const { generateSession } = require('./server/modules/practice/practice.controller');
  await generateSession(req, res);
  
  process.exit(0);
}

run();
