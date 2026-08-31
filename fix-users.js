const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsluck?appName=Cluster0";

async function run() {
  await mongoose.connect(MONGODB_URI);
  const Institute = mongoose.model('Institute', new mongoose.Schema({}, { strict: false }));
  const institute = await Institute.findOne();
  if (!institute) { console.log('No institute found'); process.exit(1); }
  
  const User = mongoose.model('User', new mongoose.Schema({ instituteId: { type: mongoose.Schema.Types.ObjectId } }, { strict: false }));
  
  const res = await User.updateMany({ $or: [{ instituteId: { $exists: false } }, { instituteId: null }] }, { $set: { instituteId: institute._id } });
  console.log('Updated users:', res.modifiedCount);
  
  process.exit(0);
}
run();
