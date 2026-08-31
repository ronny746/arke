const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId },
  name: { type: String, required: true }, // e.g., "Target Batch"
  section: { type: String }, // e.g., "A"
  description: { type: String },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  batchTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // legacy single teacher
  teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // support multiple teachers
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  type: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'offline' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Prevent duplicate batch and section for the same institute
batchSchema.index({ instituteId: 1, name: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Batch', batchSchema);
