const mongoose = require('mongoose');
const { ROLES } = require('../../config/constants');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  instituteId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Institute', 
    required: false 
  },
  branchId: { type: mongoose.Schema.Types.ObjectId },
  firstName: { type: String, default: 'Student' },
  lastName: { type: String, default: '' },
  email: { type: String, required: false, unique: true, sparse: true },
  // Distinguishes a real portal visit from an account merely imported by admin.
  lastLoginAt: { type: Date, default: null },
  password: { type: String, required: true, select: false },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  childrenIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  role: { 
    type: String, 
    enum: Object.values(ROLES),
    required: true
  },
  permissions: [{ type: String }],
  phone: { type: String },
  profilePictureUrl: { type: String },
  isActive: { type: Boolean, default: true },
  suspensionEndsAt: { type: Date, default: null },
  rfid: { 
    type: String
  },
  qrId: { type: String },
  faceId: { type: String },
  activeSessionId: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed } // Stores role-specific data like student rollNo, teacher bio
}, { timestamps: true });

// Pre-save hook to hash password
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
