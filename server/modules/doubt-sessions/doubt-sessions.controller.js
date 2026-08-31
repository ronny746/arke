const DoubtSessionsService = require('./doubt-sessions.service');
const { successResponse } = require('../../common/responses');

exports.requestSession = async (req, res, next) => {
  try {
    const data = await DoubtSessionsService.requestSession(req.user, req.body);
    return successResponse(res, 'Session requested successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getSessions = async (req, res, next) => {
  try {
    const data = await DoubtSessionsService.getSessions(req.user);
    return successResponse(res, 'Sessions retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.scheduleSession = async (req, res, next) => {
  try {
    const data = await DoubtSessionsService.scheduleSession(req.params.id, req.user.userId, req.body);
    return successResponse(res, 'Session scheduled successfully', data);
  } catch (error) {
    if (error.message.includes('not found')) return res.status(403).json({ success: false, message: error.message });
    next(error);
  }
};

exports.resolveSession = async (req, res, next) => {
  try {
    const data = await DoubtSessionsService.resolveSession(req.params.id, req.user.userId, req.body);
    return successResponse(res, 'Session resolved successfully', data);
  } catch (error) {
    if (error.message.includes('not found')) return res.status(403).json({ success: false, message: error.message });
    next(error);
  }
};
