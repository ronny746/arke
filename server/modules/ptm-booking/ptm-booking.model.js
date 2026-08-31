const mongoose = require('mongoose');

const ptmSlotSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  isBooked: { type: Boolean, default: false }
}, { timestamps: true });

const ptmBookingSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'PtmSlot', required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meetingLink: { type: String }, // Populated if online
  status: { type: String, enum: ['CONFIRMED', 'CANCELLED'], default: 'CONFIRMED' }
}, { timestamps: true });

const PtmSlot = mongoose.model('PtmSlot', ptmSlotSchema);
const PtmBooking = mongoose.model('PtmBooking', ptmBookingSchema);

module.exports = { PtmSlot, PtmBooking };
