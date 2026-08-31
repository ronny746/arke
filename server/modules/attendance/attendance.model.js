const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['present', 'absent', 'late', 'leave'], required: true },
  remarks: { type: String },
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
  date: { type: Date, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  records: [attendanceRecordSchema]
}, { timestamps: true });

// Ensure one attendance per batch/subject per day
attendanceSchema.index({ instituteId: 1, batchId: 1, subjectId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
