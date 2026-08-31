const { PtmSlot, PtmBooking } = require('./ptm-booking.model');
const { ROLES } = require('../../config/constants');

exports.createSlot = async (reqUser, payload) => {
  const { date, startTime, endTime, durationMinutes } = payload;

  // Generate slots
  const slotsToCreate = [];
  
  // Parse start and end times
  // Format is expected to be "HH:mm"
  const start = new Date(`${date}T${startTime}:00Z`);
  const end = new Date(`${date}T${endTime}:00Z`);
  
  const durationMs = durationMinutes * 60 * 1000;
  
  let currentStart = start;
  while (currentStart.getTime() + durationMs <= end.getTime()) {
    const currentEnd = new Date(currentStart.getTime() + durationMs);
    
    slotsToCreate.push({
      instituteId: reqUser.instituteId,
      teacherId: reqUser.userId,
      startTime: currentStart,
      endTime: currentEnd,
      isBooked: false
    });
    
    currentStart = currentEnd;
  }

  if (slotsToCreate.length === 0) {
    throw new Error('Invalid time range or duration for slots.');
  }

  return await PtmSlot.insertMany(slotsToCreate);
};

exports.getAvailableSlots = async (reqUser, teacherId) => {
  const query = {
    instituteId: reqUser.instituteId,
    isBooked: false,
    startTime: { $gt: new Date() }
  };
  
  if (teacherId) {
    query.teacherId = teacherId;
  }

  return await PtmSlot.find(query)
    .populate('teacherId', 'firstName lastName email')
    .sort({ startTime: 1 });
};

exports.bookSlot = async (reqUser, payload) => {
  const { slotId, studentId } = payload;
  
  const slot = await PtmSlot.findOneAndUpdate(
    { _id: slotId, instituteId: reqUser.instituteId, isBooked: false },
    { isBooked: true },
    { new: true }
  );

  if (!slot) throw new Error('Slot not found or already booked');

  const booking = new PtmBooking({
    instituteId: reqUser.instituteId,
    slotId,
    parentId: reqUser.userId,
    studentId
  });

  return await booking.save();
};

exports.getBookings = async (reqUser) => {
  const query = { instituteId: reqUser.instituteId };
  
  // Parents see their own bookings
  if (reqUser.role === ROLES.PARENT) {
    query.parentId = reqUser.userId;
  }
  
  // Teachers need a different approach since teacherId is in PtmSlot, not PtmBooking directly
  // We can populate slotId and then filter, but it's better to find slots first
  if (reqUser.role === ROLES.TEACHER) {
    const teacherSlots = await PtmSlot.find({ teacherId: reqUser.userId }).select('_id');
    const slotIds = teacherSlots.map(s => s._id);
    query.slotId = { $in: slotIds };
  }

  return await PtmBooking.find(query)
    .populate({
      path: 'slotId',
      populate: {
        path: 'teacherId',
        select: 'firstName lastName email'
      }
    })
    .populate('parentId', 'firstName lastName email')
    .populate('studentId', 'firstName lastName email')
    .sort({ createdAt: -1 });
};
