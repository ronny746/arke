const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['FULL', 'INCREMENTAL'], default: 'FULL' },
  status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  fileUrl: { type: String }, // URL to download the backup file (e.g. S3)
  sizeBytes: { type: Number },
  errorMessage: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Backup', backupSchema);
