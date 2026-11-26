const crypto = require('crypto');
const UserModel = require('../modules/users/users.model');

/**
 * A unique random 6-digit Roll Number (e.g. 482913), no prefix.
 * Unique across all students, because Roll No + password login looks the
 * roll number up without an institute.
 */
function randomSixDigit() {
  return String(crypto.randomInt(100000, 1000000));
}

async function generateUniqueRandomRollNo() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const rollNo = randomSixDigit();
    const taken = await UserModel.exists({ 'metadata.rollNo': rollNo });
    if (!taken) return rollNo;
  }
  throw new Error('Could not find a free roll number. Please try again.');
}

module.exports = {
  generateUniqueRandomRollNo,
  _randomSixDigit: randomSixDigit
};
