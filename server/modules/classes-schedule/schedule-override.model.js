const mongoose = require('mongoose');

const scheduleOverrideSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  recurringScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSchedule' }, // null if EXTRA_CLASS
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  overrideDate: { type: Date, required: true }, // The specific date for this override
  overrideType: { type: String, enum: ['CANCELLED', 'RESCHEDULED', 'EXTRA_CLASS'], required: true },
  newStartTime: { type: String }, // Used for RESCHEDULED and EXTRA_CLASS
  newEndTime: { type: String },
  reason: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Ensure a specific recurring class isn't overridden multiple times for the same date
scheduleOverrideSchema.index({ recurringScheduleId: 1, overrideDate: 1 }, { unique: true, partialFilterExpression: { recurringScheduleId: { $exists: true, $type: "objectId" } } });

module.exports = mongoose.model('ScheduleOverride', scheduleOverrideSchema);
