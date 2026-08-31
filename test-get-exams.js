require('dotenv').config();
const mongoose = require('mongoose');
const { getExams } = require('./server/modules/exams/exam.controller');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to DB');
  const req = {
    user: {
      userId: '66ab1d9237c354e7d23d83b5', // Assuming this is a teacher user ID
      role: 'teacher',
      instituteId: '66a1ef8b8c54b2d3e4a64b1c' // Some ID
    }
  };
  const res = {
    status: (code) => {
      console.log('STATUS:', code);
      return {
        json: (data) => console.log('JSON:', data)
      };
    }
  };
  
  try {
    await getExams(req, res);
  } catch (e) {
    console.error('UNCAUGHT:', e);
  }
  process.exit();
});
