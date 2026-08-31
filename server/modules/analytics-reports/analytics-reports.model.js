const mongoose = require('mongoose');

const reportTaskSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportType: { type: String, required: true }, // e.g. 'ATTENDANCE_MONTHLY', 'FEES_DUE'
  status: { type: String, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  criteria: { type: mongoose.Schema.Types.Mixed },
  fileUrl: { type: String }, // S3 url for the generated PDF/Excel
  errorMessage: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ReportTask', reportTaskSchema);
