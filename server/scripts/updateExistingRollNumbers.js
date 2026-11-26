// Gives every student a random 6-digit Roll No (e.g. 482913), replacing old
// ones such as RK657. Run: node server/scripts/updateExistingRollNumbers.js [--apply]
// Without --apply it only prints what would change.
require('dotenv').config();
const connectDB = require('../config/db');
const UserModel = require('../modules/users/users.model');
const { generateUniqueRandomRollNo } = require('../utils/rollNoGenerator');

const SIX_DIGITS = /^\d{6}$/;

async function migrateRollNumbers() {
  const apply = process.argv.includes('--apply');
  await connectDB();
  const students = await UserModel.find({ role: { $in: ['STUDENT', 'student'] } }).select('firstName lastName metadata').lean();
  let changed = 0;
  for (const student of students) {
    const current = student.metadata?.rollNo;
    if (current && SIX_DIGITS.test(String(current))) continue;
    const next = await generateUniqueRandomRollNo();
    console.log(`${student._id} ${student.firstName || ''} ${student.lastName || ''}: ${current || '(none)'} -> ${next}`);
    if (apply) {
      await UserModel.updateOne(
        { _id: student._id },
        // Some old accounts have metadata: null, which a dotted $set cannot write into.
        { $set: { metadata: { ...(student.metadata || {}), rollNo: next, previousRollNo: current || null } } }
      );
    }
    changed++;
  }
  console.log(`${apply ? 'Updated' : 'Would update'} ${changed} of ${students.length} students.`);
  process.exit(0);
}

migrateRollNumbers().catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
});
