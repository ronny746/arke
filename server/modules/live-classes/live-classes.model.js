const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  classScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSchedule', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meetingId: { type: String }, // For Zoom specific meeting ID
  startUrl: { type: String }, // For Host to start the meeting
  meetingLink: { type: String }, // For participants to join
  meetingPassword: { type: String },
  recordingUrl: { type: String },
  status: { type: String, enum: ['SCHEDULED', 'ONGOING', 'COMPLETED'], default: 'SCHEDULED' },
  participants: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    zoomUserId: { type: String },
    name: { type: String },
    userEmail: { type: String },
    joinTime: { type: Date },
    leaveTime: { type: Date },
    duration: { type: Number } // in seconds
  }]
}, { timestamps: true });

// A schedule can only have one active live class session at a time
liveClassSchema.index({ instituteId: 1, classScheduleId: 1, status: 1 });

module.exports = mongoose.model('LiveClass', liveClassSchema);
