const mongoose = require('mongoose');

const doubtSessionSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId }, // Optional reference to Subject
  topic: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['PENDING', 'SCHEDULED', 'RESOLVED', 'CANCELLED'], default: 'PENDING' },
  scheduledAt: { type: Date },
  meetingLink: { type: String },
  resolutionNotes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('DoubtSession', doubtSessionSchema);
