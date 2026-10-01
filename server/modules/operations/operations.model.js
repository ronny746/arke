const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leaveType: { type: String, enum: ['PERSONAL', 'SICK', 'EMERGENCY'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true, trim: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewNote: { type: String, trim: true }
}, { timestamps: true });

const mentorSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  name: { type: String, required: true },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  availableSlots: [{ startAt: { type: Date, required: true }, endAt: { type: Date, required: true } }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const mentorSessionSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  // Exactly one audience is selected by the service: an individual batch or
  // a course (which means all active batches enrolled in that course).
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  meetingLink: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], default: 'SCHEDULED' },
  swappedFromMentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' }
}, { timestamps: true });

mentorSessionSchema.index({ batchId: 1, startAt: 1 });
mentorSessionSchema.index({ courseId: 1, startAt: 1 });

module.exports = {
  LeaveRequest: mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', leaveRequestSchema),
  Mentor: mongoose.models.Mentor || mongoose.model('Mentor', mentorSchema),
  MentorSession: mongoose.models.MentorSession || mongoose.model('MentorSession', mentorSessionSchema)
};
