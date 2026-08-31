const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date, required: true }
}, { timestamps: true });

const homeworkSubmissionSchema = new mongoose.Schema({
  homeworkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Homework', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['PENDING', 'SUBMITTED', 'CHECKED'], default: 'SUBMITTED' }
}, { timestamps: true });

homeworkSubmissionSchema.index({ homeworkId: 1, studentId: 1 }, { unique: true });

const Homework = mongoose.model('Homework', homeworkSchema);
const HomeworkSubmission = mongoose.model('HomeworkSubmission', homeworkSubmissionSchema);

module.exports = { Homework, HomeworkSubmission };
