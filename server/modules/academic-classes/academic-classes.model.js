const mongoose = require('mongoose');

const academicClassSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId },
  name: { type: String, required: true }, // e.g., "Class 10"
  section: { type: String }, // e.g., "A"
  classTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  type: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'offline' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Prevent duplicate class and section for the same institute
academicClassSchema.index({ instituteId: 1, name: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('AcademicClass', academicClassSchema);
