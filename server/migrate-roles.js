/**
 * Converts accounts from retired roles to the supported `admin` role.
 *
 * Usage: MONGODB_URI='mongodb://...' npm run migrate:roles
 */
require('dotenv').config();

const mongoose = require('mongoose');
const UserModel = require('./modules/users/users.model');

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
const retiredRoles = [
  'super_admin',
  'super_super_admin',
  'institute_admin',
  'admin_acadops',
  'admin_operations',
  'staff'
];

async function migrateRoles() {
  if (!mongoUri) throw new Error('MONGODB_URI (or MONGO_URI) is required.');
  await mongoose.connect(mongoUri);
  try {
    const result = await UserModel.updateMany(
      { role: { $in: retiredRoles } },
      { $set: { role: 'admin' } }
    );
    console.log(`Role migration completed. ${result.modifiedCount} account(s) converted to admin.`);
  } finally {
    await mongoose.disconnect();
  }
}

migrateRoles().catch((error) => {
  console.error(`Role migration failed: ${error.message}`);
  process.exitCode = 1;
});
