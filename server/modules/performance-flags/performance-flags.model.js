const mongoose = require('mongoose');

const performanceFlagSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'OnlineExam', required: true },
  subjectName: { type: String, required: true },
  topicName: { type: String, required: true },
  percentage: { type: Number, required: true, min: 0, max: 100 },
  flag: { type: String, enum: ['RED', 'YELLOW', 'GREEN'], required: true },
  remedialSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PracticeSession' },
  remedialAttemptedAt: { type: Date }
}, { timestamps: true });

performanceFlagSchema.index({ studentId: 1, examId: 1, subjectName: 1, topicName: 1 }, { unique: true });

module.exports = mongoose.models.PerformanceFlag || mongoose.model('PerformanceFlag', performanceFlagSchema);
