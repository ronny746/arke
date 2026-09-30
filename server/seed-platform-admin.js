/**
 * Creates the first admin account for a fresh database.
 *
 * Usage:
 * BOOTSTRAP_ADMIN_EMAIL=owner@example.com \
 * BOOTSTRAP_ADMIN_PASSWORD='use-a-long-unique-password' \
 * BOOTSTRAP_ADMIN_FIRST_NAME='Platform' \
 * BOOTSTRAP_ADMIN_LAST_NAME='Owner' \
 * npm run bootstrap:platform-admin
 */
require('dotenv').config();

const mongoose = require('mongoose');
const UserModel = require('./modules/users/users.model');
const { ROLES } = require('./config/constants');

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');
const firstName = String(process.env.BOOTSTRAP_ADMIN_FIRST_NAME || 'Platform').trim();
const lastName = String(process.env.BOOTSTRAP_ADMIN_LAST_NAME || 'Administrator').trim();

function fail(message) {
  console.error(`Bootstrap failed: ${message}`);
  process.exitCode = 1;
}

async function bootstrap() {
  if (!mongoUri) {
    fail('MONGODB_URI (or MONGO_URI) is required.');
    return;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    fail('BOOTSTRAP_ADMIN_EMAIL must be a valid email address.');
    return;
  }
  if (password.length < 12) {
    fail('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.');
    return;
  }

  await mongoose.connect(mongoUri);
  try {
    const existingPlatformAdmin = await UserModel.findOne({ role: ROLES.ADMIN }).select('_id email');
    if (existingPlatformAdmin) {
      fail(`A platform admin already exists (${existingPlatformAdmin.email}). This seed will not overwrite it.`);
      return;
    }

    const emailOwner = await UserModel.findOne({ email }).select('_id role');
    if (emailOwner) {
      fail('That email is already assigned to another account. Use a different bootstrap email.');
      return;
    }

    await UserModel.create({
      firstName,
      lastName,
      email,
      password,
      role: ROLES.ADMIN,
      isActive: true,
    });

    console.log(`Platform admin created for ${email}. You can now create institutes through POST /api/v1/institutes.`);
  } finally {
    await mongoose.disconnect();
  }
}

bootstrap().catch((error) => {
  console.error(`Bootstrap failed: ${error.message}`);
  process.exitCode = 1;
});
