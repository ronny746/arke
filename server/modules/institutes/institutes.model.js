const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String },
  address: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String }
});

const instituteSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  domain: { type: String, unique: true, sparse: true },
  subdomain: { type: String, unique: true, required: true },
  logoUrl: { type: String },
  planType: { type: String, enum: ['free', 'basic', 'premium', 'enterprise'], default: 'free' },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String },
  address: { type: String },
  branches: [branchSchema],
  settings: {
    features: {
      liveClasses: { type: Boolean, default: true },
      paymentGateway: { type: Boolean, default: false },
      smsNotifications: { type: Boolean, default: false }
    },
    branding: {
      primaryColor: { type: String, default: '#000000' },
      secondaryColor: { type: String, default: '#ffffff' }
    }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Institute', instituteSchema);
