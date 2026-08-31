const SecurityAuditService = require('./security-audit.service');
const { successResponse } = require('../../common/responses');

exports.getLogs = async (req, res, next) => {
  try {
    const data = await SecurityAuditService.getLogs(req.user, req.query);
    return successResponse(res, 'Security audit logs retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};
