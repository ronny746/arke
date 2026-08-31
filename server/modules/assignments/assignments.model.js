const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId },
  title: { type: String, required: true },
  description: { type: String }, // Rich text
  attachments: [{ type: String }], // URLs
  dueDate: { type: Date, required: true },
  maxMarks: { type: Number, default: 100 }
}, { timestamps: true });

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  attachments: [{ type: String }],
  marksObtained: { type: Number },
  teacherComments: { type: String },
  status: { type: String, enum: ['submitted', 'graded', 'returned'], default: 'submitted' }
}, { timestamps: true });

assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

const Assignment = mongoose.model('Assignment', assignmentSchema);
const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);

module.exports = { Assignment, AssignmentSubmission };
