const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }, // Legacy compatibility for older indexes/data
  name: { type: String, required: true }, // e.g., "Mathematics"
  code: { type: String }, // e.g., "MATH101"
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Teacher assigned to this subject for this batch
  description: { type: String },
  credits: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// A batch should not have multiple subjects with the exact same name
subjectSchema.index({ instituteId: 1, batchId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
