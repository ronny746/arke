const Notification = require('./notifications.model');

exports.sendNotification = async (reqUser, payload) => {
  const notification = new Notification({
    ...payload,
    instituteId: reqUser.instituteId
  });
  return await notification.save();
};

exports.getNotifications = async (reqUser) => {
  return await Notification.find({ instituteId: reqUser.instituteId, userId: reqUser.userId })
    .sort({ createdAt: -1 })
    .limit(50);
};

exports.markAsRead = async (id, reqUser) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId: reqUser.userId },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw new Error('Notification not found');
  return notification;
};
