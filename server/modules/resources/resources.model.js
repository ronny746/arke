const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }, // Legacy, for backward compatibility
  batchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }], // Empty array means Global/All Batches
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['NOTES', 'PAST_PAPER', 'VIDEO', 'SYLLABUS', 'FOLDER'], required: true },
  fileUrl: { type: String, required: function() { return this.type !== 'FOLDER'; } },
  folderPath: { type: String, default: '/' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Resource', resourceSchema);
