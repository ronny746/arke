const mongoose = require('mongoose');
const uri = 'mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsarke?appName=Cluster0';
const practiceController = require('./server/modules/practice/practice.controller.js');

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const student = await db.collection('users').findOne({ role: 'student' });
  if (!student) {
    console.log("No student found");
    process.exit(0);
  }

  console.log("Found student id:", student._id.toString());

  const req = {
    user: {
      userId: student._id.toString(),
      instituteId: student.instituteId.toString()
    },
    body: {
      sessionType: 'DPP',
      subject: '',
      chapter: '',
      topic: '',
      difficulty: '',
      numberOfQuestions: 5
    }
  };

  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log("Response:", this.statusCode, data.success ? "Success" : data.message);
      if (data.data) {
        console.log("Generated DPP ID:", data.data._id);
      }
    }
  };

  await practiceController.generateSession(req, res);

  process.exit(0);
}

run().catch(console.error);
