const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['INFO', 'ALERT', 'SUCCESS'], default: 'INFO' },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

// Index to quickly fetch a user's unread notifications
notificationSchema.index({ instituteId: 1, userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
