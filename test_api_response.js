const mongoose = require('mongoose');
const connectDB = require('./server/config/db');
require('./server/modules/users/users.model');
const Doubt = require('./server/modules/doubts/doubts.model');

async function run() {
  await connectDB();
  const doubts = await Doubt.find({ batchId: "6a745fec56b3f43e6111a8bf" })
      .populate('studentId', 'name email profilePicture')
      .populate('teacherId', 'name email profilePicture')
      .sort({ createdAt: -1 });

  if (doubts.length > 0) {
    console.log("Frontend API doubt[0]:", JSON.stringify(doubts[0], null, 2));
    console.log("studentId type:", typeof doubts[0].studentId);
    console.log("studentId._id:", doubts[0].studentId._id);
  } else {
    console.log("No doubts found.");
  }
  process.exit();
}
run();
