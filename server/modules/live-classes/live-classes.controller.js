const LiveClassesService = require('./live-classes.service');
const { successResponse } = require('../../common/responses');

const notifyLiveClassChanged = (req, action, liveClass) => {
  const io = req.app?.get('io');
  if (!io) return;

  io.emit('live-class:changed', {
    action,
    liveClassId: liveClass?._id?.toString() || liveClass?.id?.toString(),
    instituteId: liveClass?.instituteId?.toString(),
    status: liveClass?.status,
  });
};

exports.startLiveClass = async (req, res, next) => {
  try {
    const data = await LiveClassesService.startLiveClass(req, req.body);
    notifyLiveClassChanged(req, 'started', data);
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
    notifyLiveClassChanged(req, 'ended', data);
    return successResponse(res, 'Live class ended successfully', data);
  } catch (error) {
    if (error.message.includes('not found')) return res.status(403).json({ success: false, message: error.message });
    next(error);
  }
};

exports.syncZoomData = async (req, res, next) => {
  try {
    const data = await LiveClassesService.syncZoomData(req.params.id);
    return successResponse(res, 'Zoom class data synced successfully', data);
  } catch (error) {
    next(error);
  }
};
