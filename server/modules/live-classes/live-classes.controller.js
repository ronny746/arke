const LiveClassesService = require('./live-classes.service');
const LiveClass = require('./live-classes.model');
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

exports.zoomWebhook = async (req, res, next) => {
  try {
    const crypto = require('crypto');
    const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
    if (!secret) return res.status(503).json({ message: 'Zoom webhook secret is not configured.' });
    const timestamp = req.get('x-zm-request-timestamp') || '';
    const signature = req.get('x-zm-signature') || '';
    const expected = `v0=${crypto.createHmac('sha256', secret).update(`v0:${timestamp}:${req.rawBody?.toString() || ''}`).digest('hex')}`;
    if (!timestamp || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.sendStatus(401);
    const event = req.body?.event;
    if (event === 'endpoint.url_validation') {
      const plainToken = req.body?.payload?.plainToken || '';
      return res.json({ plainToken, encryptedToken: crypto.createHmac('sha256', secret).update(plainToken).digest('hex') });
    }
    if (event === 'recording.completed') {
      const meetingId = req.body?.payload?.object?.id;
      const cloudUrl = req.body?.payload?.object?.share_url || req.body?.payload?.object?.recording_files?.find((f) => f.file_type === 'MP4')?.download_url;
      if (meetingId && cloudUrl) {
        const liveClass = await LiveClass.findOne({ meetingId: String(meetingId) });
        if (liveClass) {
          liveClass.recordingUrl = cloudUrl;
          await liveClass.save();
          await LiveClassesService.syncZoomData(liveClass._id);
        }
      }
      return res.sendStatus(200);
    }
    if (event !== 'meeting.ended') return res.sendStatus(200);
    const liveClass = await LiveClassesService.endLiveClassFromZoom(req.body?.payload?.object?.id);
    if (liveClass) {
      const io = req.app?.get('io');
      io?.emit('live-class:changed', { action: 'ended', liveClassId: String(liveClass._id), instituteId: String(liveClass.instituteId), status: liveClass.status });
    }
    return res.sendStatus(200);
  } catch (error) { next(error); }
};
