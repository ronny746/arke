const UserModel = require('../modules/users/users.model');

/**
 * Generates a unique 3-digit random Roll Number with 'RK' prefix (e.g., RK719, RK305, RK842)
 */
async function generateUniqueRandomRollNo(instituteId, prefix = 'RK') {
  let rollNo = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 500) {
    attempts++;
    // Random 3-digit number between 100 and 999
    const random3Digit = Math.floor(100 + Math.random() * 900);
    rollNo = `${prefix}${random3Digit}`;

    const query = { 'metadata.rollNo': rollNo };
    if (instituteId) {
      query.instituteId = instituteId;
    }

    const existing = await UserModel.findOne(query);
    if (!existing) {
      isUnique = true;
    }
  }

  // Fallback to 4-digit if all 3-digit slots are used up
  if (!isUnique) {
    const random4Digit = Math.floor(1000 + Math.random() * 9000);
    rollNo = `${prefix}${random4Digit}`;
  }

  return rollNo;
}

module.exports = {
  generateUniqueRandomRollNo
};
