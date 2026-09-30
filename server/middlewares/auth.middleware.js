const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { errorResponse } = require('../common/responses');

const UserModel = require('../modules/users/users.model');

module.exports = async (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  
  if (!token) {
    return errorResponse(res, 'Access denied. No token provided.', null, 401);
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    // Use the current account values rather than trusting a role embedded in an
    // older token. This keeps role migrations and admin access effective without
    // requiring every browser to clear its saved token first.
    const user = await UserModel.findById(decoded.userId)
      .select('role instituteId branchId permissions activeSessionId isActive');
    if (!user || !user.isActive) {
      return errorResponse(res, 'Session expired. Please sign in again.', null, 401);
    }

    // Check session validity to enforce single-device login.
    if (decoded.sessionId && user.activeSessionId !== decoded.sessionId) {
      return errorResponse(res, 'Session expired. You logged in on another device.', null, 401);
    }

    req.user = {
      ...decoded,
      role: user.role,
      instituteId: user.instituteId,
      branchId: user.branchId,
      permissions: user.permissions || []
    };
    
    next();
  } catch (ex) {
    return errorResponse(res, 'Invalid token.', ex.message, 401);
  }
};
