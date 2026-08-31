const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  provider: { type: String, enum: ['ZOOM', 'STRIPE', 'RAZORPAY', 'TWILIO', 'WHATSAPP'], required: true },
  apiKey: { type: String, required: true },
  apiSecret: { type: String }, // Optional for some providers
  webhookUrl: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure one active provider type per institute
integrationSchema.index({ instituteId: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model('Integration', integrationSchema);
