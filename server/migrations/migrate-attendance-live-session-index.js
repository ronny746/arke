/* Run once during deployment after upgrading the attendance module.
 * It replaces the old one-register-per-subject/day unique index with the
 * session-aware index required for multiple live classes on the same day.
 */
require('dotenv').config();
const connectDB = require('../config/db');
const Attendance = require('../modules/attendance/attendance.model');

const OLD_INDEX = 'instituteId_1_batchId_1_subjectId_1_date_1';
const NEW_INDEX = {
  instituteId: 1,
  batchId: 1,
  subjectId: 1,
  date: 1,
  liveClassId: 1
};

async function run() {
  await connectDB();
  const indexes = await Attendance.collection.indexes();
  if (indexes.some(index => index.name === OLD_INDEX)) {
    await Attendance.collection.dropIndex(OLD_INDEX);
    console.log(`Dropped ${OLD_INDEX}`);
  }
  await Attendance.collection.createIndex(NEW_INDEX, {
    unique: true,
    name: 'instituteId_1_batchId_1_subjectId_1_date_1_liveClassId_1'
  });
  console.log('Attendance live-session index is ready.');
  process.exit(0);
}

run().catch(error => {
  console.error('Attendance index migration failed:', error);
  process.exit(1);
});
