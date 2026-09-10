const mongoose = require('mongoose');
const uri = 'mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsarke?appName=Cluster0';
const practiceController = require('./server/modules/practice/practice.controller.js');

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const student = await db.collection('users').findOne({ role: 'student' });
  const req = {
    user: { instituteId: student.instituteId.toString() }
  };
  const res = {
    status: function(c) { this.code = c; return this; },
    json: function(data) { console.log(JSON.stringify(data, null, 2)); }
  };

  await practiceController.getFilters(req, res);
  process.exit(0);
}
run();
