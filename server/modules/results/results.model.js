const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  marksObtained: { type: Number, required: true },
  grade: { type: String, required: true },
  remarks: { type: String }
}, { timestamps: true });

// Ensure a student only has one result per exam
resultSchema.index({ instituteId: 1, examId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);
