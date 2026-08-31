const Notification = require('./notifications.model');

exports.sendNotification = async (reqUser, payload) => {
  const notification = new Notification({
    ...payload,
    instituteId: reqUser.instituteId
  });
  return await notification.save();
};

exports.getNotifications = async (reqUser) => {
  const userId = reqUser.userId || reqUser.id || reqUser._id;
  return await Notification.find({
    $or: [
      { userId: userId },
      { instituteId: reqUser.instituteId, userId: { $exists: false } }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(50);
};

exports.markAsRead = async (id, reqUser) => {
  const userId = reqUser.userId || reqUser.id || reqUser._id;
  const notification = await Notification.findOneAndUpdate(
    { _id: id, $or: [{ userId: userId }, { instituteId: reqUser.instituteId }] },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw new Error('Notification not found');
  return notification;
};

exports.markAllAsRead = async (reqUser) => {
  const userId = reqUser.userId || reqUser.id || reqUser._id;
  await Notification.updateMany(
    { userId: userId, isRead: false },
    { $set: { isRead: true } }
  );
  return { success: true };
};

exports.deleteNotification = async (id, reqUser) => {
  const userId = reqUser.userId || reqUser.id || reqUser._id;
  const notification = await Notification.findOneAndDelete({
    _id: id,
    $or: [{ userId: userId }, { instituteId: reqUser.instituteId }]
  });
  if (!notification) throw new Error('Notification not found');
  return { success: true };
};
