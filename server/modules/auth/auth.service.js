const jwt = require('jsonwebtoken');
const UserModel = require('../users/users.model');
const env = require('../../config/env');
const { dobPasswordCandidates } = require('../arke-portal/portal.rules');

exports.login = async (email, password, expectedRole) => {
  const identity = String(email || '').trim();
  const normalizedPhone = identity.replace(/\D/g, '').slice(-10);
  const query = { 
    $or: [
      { email: identity },
      { 'metadata.rollNo': identity }, // "email" parameter can also hold roll no
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

  const isDobLogin = ['student', 'parent'].includes(String(user.role).toLowerCase());
  let passwordCandidates;
  try {
    passwordCandidates = isDobLogin ? dobPasswordCandidates(password) : [password];
  } catch {
    throw new Error('Invalid email or password');
  }
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
  await UserModel.updateOne({ _id: user._id }, { $set: { activeSessionId: sessionId } });

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
