const jwt = require('jsonwebtoken');
const UserModel = require('../users/users.model');
const env = require('../../config/env');

exports.login = async (email, password, expectedRole) => {
  const query = { 
    $or: [
      { email },
      { 'metadata.rollNo': email } // "email" parameter can also hold roll no
    ],
    isActive: true 
  };
  if (expectedRole) {
    query.role = expectedRole;
  }

  const user = await UserModel.findOne(query).select('+password').populate('instituteId', 'name');
  
  if (!user) {
    throw new Error('Invalid email, password, or you do not have access to this portal.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const payload = {
    userId: user._id,
    role: user.role,
    instituteId: user.instituteId ? (user.instituteId._id || user.instituteId) : null,
    branchId: user.branchId,
    permissions: user.permissions,
    instituteName: user.instituteId ? user.instituteId.name : null
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
