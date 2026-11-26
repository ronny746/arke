const jwt = require('jsonwebtoken');
const UserModel = require('../users/users.model');
const env = require('../../config/env');
const { dobPasswordCandidates } = require('../arke-portal/portal.rules');
const OtpModel = require('../../models/otp.model');
const { sendMobileOTP } = require('../../services/sms.service');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Admin switch (Settings > Authentication): may students also sign in with
// Roll No / mobile + password? Mobile OTP always works.
async function isStudentPasswordLoginOn() {
  const SystemConfig = require('../system-config/system-config.model');
  const config = await SystemConfig.findOne().select('authSettings').lean();
  return config?.authSettings?.enableStudentPasswordLogin === true;
}
exports.isStudentPasswordLoginOn = isStudentPasswordLoginOn;

// Student and parent passwords used to be their date of birth; keep accepting
// those formats, but a password the student set themselves must work as typed.
function passwordCandidatesFor(role, password) {
  const raw = String(password || '');
  if (!['student', 'parent'].includes(String(role).toLowerCase())) return [raw];
  try {
    return [...new Set([raw, ...dobPasswordCandidates(raw)])];
  } catch {
    return [raw];
  }
}
exports._passwordCandidatesFor = passwordCandidatesFor;

// Student found by roll number (any case) or registered mobile number.
async function findStudentByIdentifier(identifier) {
  const id = String(identifier || '').trim();
  if (!id) return null;
  const phone = id.replace(/\D/g, '').slice(-10);
  const or = [{ 'metadata.rollNo': new RegExp(`^${escapeRegex(id)}$`, 'i') }];
  if (phone.length === 10 && /^[+\d\s-]+$/.test(id)) {
    or.push({ phone: { $in: [phone, `+91${phone}`] } });
  }
  return UserModel.findOne({ role: 'student', isActive: true, $or: or });
}
exports._findStudentByIdentifier = findStudentByIdentifier;

const maskPhone = (p) => {
  const d = String(p || '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `******${d.slice(-4)}` : '';
};

const FORGOT_COOLDOWN_MS = 30 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// Forgot / set password, step 1: send an OTP to the student's own mobile.
exports.requestPasswordReset = async (identifier) => {
  if (!(await isStudentPasswordLoginOn())) {
    throw Object.assign(new Error('Password login is turned off. Please sign in with mobile OTP.'), { status: 403 });
  }
  const user = await findStudentByIdentifier(identifier);
  if (!user) throw Object.assign(new Error('No student account found for this Roll No or mobile number.'), { status: 404 });
  const phone = String(user.phone || '').replace(/\D/g, '').slice(-10);
  if (phone.length !== 10) {
    throw Object.assign(new Error('No mobile number is linked to this account. Please contact the institute.'), { status: 400 });
  }
  const recent = await OtpModel.findOne({ phone, purpose: 'password-reset' }).sort({ createdAt: -1 }).lean();
  if (recent && Date.now() - new Date(recent.createdAt).getTime() < FORGOT_COOLDOWN_MS) {
    throw Object.assign(new Error('Please wait 30 seconds before asking for a new OTP.'), { status: 429 });
  }
  const result = await sendMobileOTP(phone);
  const otp = result?.otp || Math.floor(100000 + Math.random() * 900000).toString();
  await OtpModel.deleteMany({ phone, purpose: 'password-reset' });
  await OtpModel.create({ phone, otp, purpose: 'password-reset' });
  return { maskedPhone: maskPhone(phone) };
};

// Forgot / set password, step 2: OTP + new password. Signs out other devices.
exports.resetPassword = async (identifier, otp, newPassword) => {
  if (!(await isStudentPasswordLoginOn())) {
    throw Object.assign(new Error('Password login is turned off. Please sign in with mobile OTP.'), { status: 403 });
  }
  const password = String(newPassword || '');
  if (password.length < 6) throw Object.assign(new Error('Password must be at least 6 characters.'), { status: 400 });
  const user = await findStudentByIdentifier(identifier);
  if (!user) throw Object.assign(new Error('No student account found for this Roll No or mobile number.'), { status: 404 });
  const phone = String(user.phone || '').replace(/\D/g, '').slice(-10);
  const record = await OtpModel.findOne({ phone, purpose: 'password-reset' }).sort({ createdAt: -1 });
  if (!record) throw Object.assign(new Error('OTP expired. Please ask for a new one.'), { status: 400 });
  if (String(record.otp) !== String(otp || '').trim()) {
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts >= MAX_OTP_ATTEMPTS) await record.deleteOne();
    else await record.save();
    throw Object.assign(new Error(record.attempts >= MAX_OTP_ATTEMPTS ? 'Too many wrong tries. Please ask for a new OTP.' : 'Wrong OTP. Please check and try again.'), { status: 400 });
  }
  await OtpModel.deleteMany({ phone, purpose: 'password-reset' });
  const fresh = await UserModel.findById(user._id).select('+password');
  fresh.password = password;
  fresh.activeSessionId = null; // other devices must sign in again
  await fresh.save();
  return { rollNo: user.metadata?.rollNo || null };
};

exports.login = async (email, password, expectedRole) => {
  const identity = String(email || '').trim();
  const normalizedPhone = identity.replace(/\D/g, '').slice(-10);
  const query = { 
    $or: [
      { email: identity },
      { 'metadata.rollNo': new RegExp(`^${escapeRegex(identity)}$`, 'i') }, // "email" parameter can also hold roll no
      { phone: { $in: [identity, normalizedPhone, normalizedPhone ? `+91${normalizedPhone}` : identity] } }
    ],
    isActive: true 
  };
  if (expectedRole) query.role = expectedRole === 'admin' ? 'admin' : expectedRole;

  const user = await UserModel.findOne(query).select('+password').populate('instituteId', 'name');
  
  if (!user) {
    throw new Error('Invalid email, password, or you do not have access to this portal.');
  }

  if (user.suspensionEndsAt) {
    if (user.suspensionEndsAt > new Date()) throw new Error('This student account is suspended until the configured end date.');
    user.suspensionEndsAt = null;
    await user.save();
  }

  if (String(user.role).toLowerCase() === 'student' && !(await isStudentPasswordLoginOn())) {
    throw Object.assign(new Error('Password login is turned off. Please sign in with mobile OTP.'), { status: 403 });
  }

  const passwordCandidates = passwordCandidatesFor(user.role, password);
  let isMatch = false;
  for (const candidate of passwordCandidates) {
    if (await user.comparePassword(candidate)) {
      isMatch = true;
      break;
    }
  }
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const crypto = require('crypto');
  const sessionId = crypto.randomUUID();
  user.activeSessionId = sessionId;
  await UserModel.updateOne(
    { _id: user._id },
    { $set: { activeSessionId: sessionId, lastLoginAt: new Date() } }
  );

  const payload = {
    userId: user._id,
    role: user.role,
    instituteId: user.instituteId ? (user.instituteId._id || user.instituteId) : null,
    branchId: user.branchId,
    permissions: user.permissions,
    instituteName: user.instituteId ? user.instituteId.name : null,
    sessionId: sessionId
  };

  if (user.role === 'parent' && user.childrenIds) {
    payload.childrenIds = user.childrenIds;
  }

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  
  const userObj = user.toObject();
  delete userObj.password;
  
  if (userObj.instituteId && typeof userObj.instituteId === 'object') {
    userObj.instituteName = userObj.instituteId.name;
    userObj.instituteId = userObj.instituteId._id;
  }

  return { token, user: userObj };
};

exports.changePassword = async (userId, oldPassword, newPassword) => {
  const user = await UserModel.findById(userId).select('+password');
  if (!user) throw new Error('User not found');

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) throw new Error('Invalid old password');

  user.password = newPassword;
  await user.save();
};
