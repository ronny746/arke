const NotificationsService = require('./notifications.service');
const User = require('../users/users.model');
const Batch = require('../batches/batches.model');
const { successResponse } = require('../../common/responses');

exports.sendNotification = async (req, res, next) => {
  try {
    const data = await NotificationsService.sendNotification(req.user, req.body, req.app.get('io'));
    return successResponse(res, 'Notification sent successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.registerPushDevice = async (req, res, next) => {
  try {
    const data = await NotificationsService.registerPushDevice(req.user, req.body);
    return successResponse(res, 'Push device registered', data, null, 201);
  } catch (error) { next(error); }
};

exports.removePushDevice = async (req, res, next) => {
  try {
    await NotificationsService.removePushDevice(req.user, req.body.token);
    return successResponse(res, 'Push device removed');
  } catch (error) { next(error); }
};

exports.broadcastNotification = async (req, res, next) => {
  try {
    const { audience, batchId, userId, title, message, type } = req.body;
    const instituteId = req.user.instituteId;
    const isTeacher = String(req.user.role).toLowerCase() === 'teacher';
    // Teachers can only send a one-way announcement to students in one of
    // their own batches. They can never enumerate or message an institute.
    if (isTeacher && audience !== 'batch_students') {
      return res.status(403).json({ success: false, message: 'Teachers may broadcast only to students in one of their assigned batches.' });
    }
    let userIds = [];
    if (audience === 'all_students' || audience === 'all_parents') {
      const role = audience === 'all_students' ? 'student' : 'parent';
      userIds = (await User.find({ instituteId, role, isActive: true }).select('_id')).map(user => user._id);
    } else if (audience === 'student' || audience === 'parent') {
      const role = audience;
      const recipient = await User.findOne({ _id: userId, instituteId, role, isActive: true }).select('_id');
      if (!recipient) return res.status(404).json({ success: false, message: 'Active recipient not found.' });
      userIds = [recipient._id];
    } else {
      const batchQuery = { _id: batchId, instituteId, isActive: true };
      if (isTeacher) {
        batchQuery.$or = [{ batchTeacherId: req.user.userId }, { teachers: req.user.userId }];
      }
      const batch = await Batch.findOne(batchQuery).select('students');
      if (!batch) return res.status(404).json({ success: false, message: 'Active batch not found.' });
      userIds = batch.students;
      if (audience === 'batch_families' && userIds.length) {
        const students = await User.find({ _id: { $in: userIds }, instituteId }).select('parentId');
        userIds = [...userIds, ...students.map(student => student.parentId).filter(Boolean)];
      }
    }
    const data = await NotificationsService.createForUsers({
      instituteId,
      userIds,
      title,
      message,
      type,
      metadata: { entityType: 'announcement', audience, batchId: batchId || '' },
      io: req.app.get('io')
    });
    return successResponse(res, `Announcement sent to ${data.length} recipient${data.length === 1 ? '' : 's'}`, { delivered: data.length }, null, 201);
  } catch (error) { next(error); }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const data = await NotificationsService.getNotifications(req.user);
    return successResponse(res, 'Notifications retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const data = await NotificationsService.markAsRead(req.params.id, req.user);
    return successResponse(res, 'Notification marked as read', data);
  } catch (error) {
    if (error.message && error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const data = await NotificationsService.markAllAsRead(req.user);
    return successResponse(res, 'All notifications marked as read', data);
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const data = await NotificationsService.deleteNotification(req.params.id, req.user);
    return successResponse(res, 'Notification deleted successfully', data);
  } catch (error) {
    if (error.message && error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};
