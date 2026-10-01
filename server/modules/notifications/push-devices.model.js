const mongoose = require('mongoose');

const pushDeviceSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, unique: true, index: true },
  platform: { type: String, enum: ['android', 'ios'], required: true },
  appVersion: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastSeenAt: { type: Date, default: Date.now }
}, { timestamps: true });

pushDeviceSchema.index({ instituteId: 1, userId: 1, isActive: 1 });

module.exports = mongoose.models.PushDevice || mongoose.model('PushDevice', pushDeviceSchema);
