const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['present', 'absent', 'late', 'leave'], required: true },
  remarks: { type: String },
  joinedAt: { type: Date },
  joinEvents: [{ joinedAt: { type: Date, required: true }, leftAt: { type: Date, default: null }, source: { type: String, default: 'live_class' } }],
  source: { type: String, enum: ['teacher', 'live_class', 'geo'], default: 'teacher' },
  geoCheckIn: {
    lat: { type: Number },
    lng: { type: Number },
    timestamp: { type: Date }
  }
});

const attendanceSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId },
  batchId: { type: mongoose.Schema.Types.ObjectId, required: true }, // ref to Batch
  subjectId: { type: mongoose.Schema.Types.ObjectId }, // optional, for subject-wise attendance
  liveClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveClass', default: null },
  date: { type: Date, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  records: [attendanceRecordSchema]
}, { timestamps: true });

// One manual register per subject/day and one register for each live session.
attendanceSchema.index({ instituteId: 1, batchId: 1, subjectId: 1, date: 1, liveClassId: 1 }, { unique: true });
attendanceSchema.index({ instituteId: 1, liveClassId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
