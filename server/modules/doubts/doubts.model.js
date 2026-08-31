const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true },
  attachments: [{ type: String }],
  solution: { type: String },
  solutionAttachments: [{ type: String }],
  status: { type: String, enum: ['PENDING', 'RESOLVED'], default: 'PENDING' }
}, { timestamps: true });

module.exports = mongoose.model('Doubt', doubtSchema);
