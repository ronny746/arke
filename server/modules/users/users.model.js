const mongoose = require('mongoose');
const { ROLES } = require('../../config/constants');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  instituteId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Institute', 
    required: function() { return this.role !== ROLES.SUPER_SUPER_ADMIN && this.role !== 'student'; } 
  },
  branchId: { type: mongoose.Schema.Types.ObjectId },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, sparse: true, unique: true },
  password: { type: String, select: false },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  childrenIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  role: { 
    type: String, 
    enum: Object.values(ROLES),
    required: true
  },
  permissions: [{ type: String }],
  phone: { 
    type: String, 
    required: function() { return this.role === 'student' || this.role === 'parent'; } 
  },
  profilePictureUrl: { type: String },
  isActive: { type: Boolean, default: true },
  rfid: { 
    type: String
  },
  qrId: { type: String },
  faceId: { type: String },
  activeSessionId: { type: String }, // Used to enforce single-device login
  metadata: { type: mongoose.Schema.Types.Mixed } // Stores role-specific data like student rollNo, teacher bio
}, { timestamps: true });

// Pre-save hook to hash password
userSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
