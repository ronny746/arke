const jwt = require('jsonwebtoken');
const { errorResponse } = require('../common/responses');
const env = require('../config/env');

const requireDeveloperToken = (req, res, next) => {
  try {
    // Soft deletions no longer require a developer token.
    // Hard deletes are managed via the Recycle Bin by Super Admins.
    if (req.method === 'DELETE' && req.query.hardDelete !== 'true') {
      return next();
    }

    const devToken = req.headers['x-developer-token'];
    
    if (!devToken) {
      return errorResponse(res, "Hard Deletion is disabled. Developer token is required.", null, 403);
    }

    const decoded = jwt.verify(devToken, env.JWT_SECRET || 'your_jwt_secret');
    
    if (!decoded.isDeveloper) {
      return errorResponse(res, "Invalid developer token.", null, 403);
    }

    // Pass the developer check
    next();
  } catch (error) {
    return errorResponse(res, "Invalid or expired developer token.", null, 403);
  }
};

module.exports = requireDeveloperToken;
