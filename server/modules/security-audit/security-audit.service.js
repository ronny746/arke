const AuditLog = require('./security-audit.model');

// This method can be injected into critical controllers (like auth login, or fee payment)
exports.logAction = async (payload) => {
  try {
    const log = new AuditLog(payload);
    await log.save();
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

exports.getLogs = async (reqUser, filters) => {
  const query = { instituteId: reqUser.instituteId };
  if (filters.userId) query.userId = filters.userId;
  if (filters.action) query.action = filters.action;

  return await AuditLog.find(query)
    .populate('userId', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .limit(100);
};
