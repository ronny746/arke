/**
 * Creates one admin account per email, so several people can upload and use
 * the portal at the same time (one account allows one login at a time).
 * They sign in with Email OTP; the random password is never shown or needed.
 *
 * Usage (dry run first, then --apply):
 *   node server/scripts/create-admin-accounts.js admins.csv
 *   node server/scripts/create-admin-accounts.js admins.csv --apply
 *
 * admins.csv: one per line, "email" or "email,First name,Last name".
 * Accounts that already exist are skipped, never changed.
 */
const fs = require('fs');
const crypto = require('crypto');

const EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

const parseAdminList = (text) => {
  const seen = new Set();
  const rows = [];
  const invalid = [];
  String(text || '').split(/\r?\n/).forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [rawEmail, first = '', last = ''] = trimmed.split(',').map((p) => p.trim());
    const email = rawEmail.toLowerCase();
    if (!EMAIL.test(email)) {
      invalid.push({ line: i + 1, value: trimmed });
      return;
    }
    if (seen.has(email)) return;
    seen.add(email);
    const fallback = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    rows.push({ email, firstName: first || fallback, lastName: last || '' });
  });
  return { rows, invalid };
};

const main = async () => {
  const [file, flag] = process.argv.slice(2);
  if (!file) {
    console.error('Usage: node server/scripts/create-admin-accounts.js <list.csv> [--apply]');
    process.exit(1);
  }
  require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });
  const apply = flag === '--apply';
  const { rows, invalid } = parseAdminList(fs.readFileSync(file, 'utf8'));
  invalid.forEach((r) => console.warn(`Skipping line ${r.line}: not an email (${r.value})`));

  const mongoose = require('mongoose');
  const User = require('../modules/users/users.model');
  const { ROLES } = require('../config/constants');
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  try {
    const anyAdmin = await User.findOne({ role: ROLES.ADMIN, instituteId: { $ne: null } }).select('instituteId').lean();
    if (!anyAdmin) throw new Error('No existing admin with an institute found; cannot tell which institute to use.');

    let created = 0;
    for (const row of rows) {
      const existing = await User.findOne({ email: row.email }).select('role').lean();
      if (existing) {
        console.log(`exists   ${row.email} (role ${existing.role}) - left as is`);
        continue;
      }
      if (!apply) {
        console.log(`would add ${row.email} (${row.firstName} ${row.lastName})`.trim());
        continue;
      }
      await User.create({
        ...row,
        role: ROLES.ADMIN,
        instituteId: anyAdmin.instituteId,
        password: crypto.randomBytes(24).toString('base64url'),
        isActive: true,
      });
      created++;
      console.log(`added    ${row.email}`);
    }
    console.log(apply ? `Done: ${created} admin account(s) added.` : 'Dry run only. Re-run with --apply to create them.');
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}

module.exports = { parseAdminList };
