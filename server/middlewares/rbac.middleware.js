const { errorResponse } = require('../common/responses');

// Middleware to check if user has required roles
exports.requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(res, 'Forbidden. You do not have permission to perform this action.', null, 403);
    }
    next();
  };
};

// Middleware to check specific permissions
exports.requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions || !req.user.permissions.includes(permission)) {
      return errorResponse(res, 'Forbidden. You lack the required permission.', null, 403);
    }
    next();
  };
};
