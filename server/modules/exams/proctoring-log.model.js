const mongoose = require('mongoose');

const proctoringLogSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnlineExam',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamSubmission',
    required: true,
  },
  snapshotUrl: {
    type: String, // URL of the image stored in S3
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    enum: ['PERIODIC_SNAPSHOT', 'VIOLATION_SNAPSHOT'],
    default: 'PERIODIC_SNAPSHOT',
  },
  flagged: {
    type: Boolean,
    default: false,
    // Can be used later if we run AI on the snapshot to detect cheating
  }
}, { timestamps: true });

// We can query logs quickly by student and exam
proctoringLogSchema.index({ exam: 1, student: 1 });

module.exports = mongoose.models.ProctoringLog || mongoose.model('ProctoringLog', proctoringLogSchema);
