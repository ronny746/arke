const PtmBookingService = require('./ptm-booking.service');
const { successResponse } = require('../../common/responses');

exports.createSlot = async (req, res, next) => {
  try {
    const data = await PtmBookingService.createSlot(req.user, req.body);
    return successResponse(res, 'PTM slot created successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const data = await PtmBookingService.getAvailableSlots(req.user, req.query.teacherId);
    return successResponse(res, 'Available slots retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.bookSlot = async (req, res, next) => {
  try {
    const data = await PtmBookingService.bookSlot(req.user, req.body);
    return successResponse(res, 'PTM slot booked successfully', data, null, 201);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('booked')) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};

exports.getBookings = async (req, res, next) => {
  try {
    const data = await PtmBookingService.getBookings(req.user);
    return successResponse(res, 'PTM bookings retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};
