const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  title: { type: String, required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['UNIT_TEST', 'MID_TERM', 'FINAL'], required: true },
  examDate: { type: Date, required: true },
  totalMarks: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);
