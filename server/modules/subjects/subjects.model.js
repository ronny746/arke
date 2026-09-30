const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  // Library subjects are reusable across courses, classes, and uploads. A
  // batchId is only required for a batch-specific subject.
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }, // Legacy compatibility for older indexes/data
  name: { type: String, required: true }, // e.g., "Mathematics"
  icon: { type: String, default: '📖' },
  code: { type: String }, // e.g., "MATH101"
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Teacher assigned to this subject for this batch
  description: { type: String },
  chaptersCount: { type: Number, default: 0 },
  dppsCount: { type: Number, default: 0 },
  testsCount: { type: Number, default: 0 },
  topics: [{ type: String }],
  credits: { type: Number, default: 1 },
  isLibrarySubject: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// A batch should not have multiple subjects with the exact same name
subjectSchema.index({ instituteId: 1, batchId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
