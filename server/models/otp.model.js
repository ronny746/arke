const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: { 
    type: String, 
    required: false 
  },
  email: {
    type: String,
    required: false
  },
  otp: { 
    type: String, 
    required: true 
  },
  // 'password-reset' for forgot-password OTPs; empty for sign-in OTPs.
  purpose: { type: String, required: false },
  attempts: { type: Number, default: 0 },
  createdAt: { 
    type: Date, 
    default: Date.now,
    expires: 300 // Document will automatically be removed after 5 minutes (300 seconds)
  }
});

module.exports = mongoose.models.Otp || mongoose.model('Otp', otpSchema);
