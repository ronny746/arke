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
    // Payload should contain: userId, role, instituteId, branchId, permissions, sessionId
    
    // Check session validity to enforce single-device login
    if (decoded.sessionId) {
      const user = await UserModel.findById(decoded.userId).select('activeSessionId');
      if (!user || user.activeSessionId !== decoded.sessionId) {
        return errorResponse(res, 'Session expired. You logged in on another device.', null, 401);
      }
    }

    req.user = decoded;
    
    next();
  } catch (ex) {
    return errorResponse(res, 'Invalid token.', ex.message, 401);
  }
};
