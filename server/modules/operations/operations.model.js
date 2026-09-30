const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leaveType: { type: String, enum: ['PERSONAL', 'SICK'], required: true },
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
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  meetingLink: { type: String, required: true },
  status: { type: String, enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], default: 'SCHEDULED' },
  swappedFromMentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' }
}, { timestamps: true });

mentorSessionSchema.index({ batchId: 1, startAt: 1 });

module.exports = {
  LeaveRequest: mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', leaveRequestSchema),
  Mentor: mongoose.models.Mentor || mongoose.model('Mentor', mentorSchema),
  MentorSession: mongoose.models.MentorSession || mongoose.model('MentorSession', mentorSessionSchema)
};
