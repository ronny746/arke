const Notification = require('./notifications.model');
const PushDevice = require('./push-devices.model');
const FirebaseMessaging = require('../../services/firebaseMessaging.service');

const emit = (io, notification) => {
  if (!io || !notification) return;
  const payload = typeof notification.toObject === 'function' ? notification.toObject() : notification;
  io.to(`user:${String(payload.userId)}`).emit('notification:created', payload);
};

const deliverPush = async notifications => {
  if (!notifications?.length) return;
  try {
    const userIds = [...new Set(notifications.map(notification => String(notification.userId)))];
    const devices = await PushDevice.find({ userId: { $in: userIds }, isActive: true }).select('token');
    if (!devices.length) {
      console.warn(`[FCM] No active device tokens for ${userIds.length} notification recipient(s).`);
      return;
    }
    const latest = notifications[0];
    const result = await FirebaseMessaging.sendToTokens({
      tokens: devices.map(device => device.token),
      title: latest.title,
      message: latest.message,
      data: { notificationId: latest._id, type: latest.type, ...(latest.metadata || {}) }
    });
    console.info(`[FCM] Push delivery: ${result.sent}/${devices.length} token(s) accepted.`);
    if (result.invalidTokens.length) await PushDevice.updateMany({ token: { $in: result.invalidTokens } }, { $set: { isActive: false } });
  } catch (error) {
    // Notification persistence must not fail because an external push provider is unavailable.
    console.error('[FCM] Delivery failed:', error.message);
  }
};

exports.createForUsers = async ({ instituteId, userIds, title, message, type = 'INFO', metadata = {}, io }) => {
  const ids = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!ids.length) return [];
  const notifications = await Notification.insertMany(
    ids.map(userId => ({ instituteId, userId, title, message, type, metadata })),
    { ordered: false }
  );
  notifications.forEach(notification => emit(io, notification));
  void deliverPush(notifications);
  return notifications;
};

exports.sendNotification = async (reqUser, payload, io) => {
  const notification = new Notification({
    ...payload,
    instituteId: reqUser.instituteId
  });
  const saved = await notification.save();
  emit(io, saved);
  void deliverPush([saved]);
  return saved;
};

exports.registerPushDevice = async (reqUser, { token, platform, appVersion = '' }) => PushDevice.findOneAndUpdate(
  { token },
  { $set: { instituteId: reqUser.instituteId, userId: reqUser.userId, platform, appVersion, isActive: true, lastSeenAt: new Date() } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

exports.removePushDevice = async (reqUser, token) => PushDevice.findOneAndUpdate(
  { token, userId: reqUser.userId, instituteId: reqUser.instituteId },
  { $set: { isActive: false, lastSeenAt: new Date() } },
  { new: true }
);

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
    { _id: id, instituteId: reqUser.instituteId, userId },
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
    instituteId: reqUser.instituteId,
    userId
  });
  if (!notification) throw new Error('Notification not found');
  return { success: true };
};
