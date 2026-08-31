const LiveClassesService = require('./live-classes.service');
const { successResponse } = require('../../common/responses');

exports.startLiveClass = async (req, res, next) => {
  try {
    const data = await LiveClassesService.startLiveClass(req, req.body);
    return successResponse(res, 'Live class started successfully', data, null, 201);
  } catch (error) {
    if (error.statusCode === 409 && error.liveClass) {
      return res.status(409).json({
        success: false,
        message: error.message,
        data: error.liveClass
      });
    }
    next(error);
  }
};

exports.getActiveClasses = async (req, res, next) => {
  try {
    const data = await LiveClassesService.getActiveClasses(req.user, req.query);
    return successResponse(res, 'Active live classes retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.endLiveClass = async (req, res, next) => {
  try {
    const data = await LiveClassesService.endLiveClass(req.params.id, req.user, req.body);
    return successResponse(res, 'Live class ended successfully', data);
  } catch (error) {
    if (error.message.includes('not found')) return res.status(403).json({ success: false, message: error.message });
    next(error);
  }
};
