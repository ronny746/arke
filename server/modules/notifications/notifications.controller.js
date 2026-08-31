const NotificationsService = require('./notifications.service');
const { successResponse } = require('../../common/responses');

exports.sendNotification = async (req, res, next) => {
  try {
    const data = await NotificationsService.sendNotification(req.user, req.body);
    return successResponse(res, 'Notification sent successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
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
    if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};
