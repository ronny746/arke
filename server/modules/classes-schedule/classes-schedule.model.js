const mongoose = require('mongoose');

const classScheduleSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicClass', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roomId: { type: String }, // e.g. "Room 101"
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0=Sunday, 6=Saturday
  startTime: { type: String, required: true }, // e.g. "09:00"
  endTime: { type: String, required: true }, // e.g. "10:00"
  isRecurring: { type: Boolean, default: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date }, // null means indefinite
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Prevent double booking for a teacher
classScheduleSchema.index({ instituteId: 1, teacherId: 1, dayOfWeek: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.model('ClassSchedule', classScheduleSchema);
