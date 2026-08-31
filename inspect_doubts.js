const mongoose = require('mongoose');
const connectDB = require('./server/config/db');
const Doubt = require('./server/modules/doubts/doubts.model');
const User = require('./server/modules/users/users.model');
require('dotenv').config({ path: '.env' });

async function run() {
  await connectDB();
  const doubts = await Doubt.find().populate('studentId').limit(1).lean();
  console.log("Doubt 1:", JSON.stringify(doubts[0], null, 2));
  
  if (doubts[0]) {
    console.log("Student ID object type:", typeof doubts[0].studentId);
    console.log("Student ID _id:", doubts[0].studentId?._id);
  }
  process.exit();
}
run();
