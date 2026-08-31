const ClassesScheduleService = require('./classes-schedule.service');
const { successResponse } = require('../../common/responses');

exports.createSchedule = async (req, res, next) => {
  try {
    const data = await ClassesScheduleService.createSchedule(req.user, req.body);
    return successResponse(res, 'Class schedule created successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getSchedule = async (req, res, next) => {
  try {
    const data = await ClassesScheduleService.getSchedule(req.user, req.query);
    return successResponse(res, 'Class schedule retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getMySchedule = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    if (req.user.role === 'teacher') {
      filters.teacherId = req.user.userId;
    }
    const data = await ClassesScheduleService.getSchedule(req.user, filters);
    return successResponse(res, 'My schedule retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.deleteSchedule = async (req, res, next) => {
  try {
    await ClassesScheduleService.deleteSchedule(req.params.id, req.user);
    return successResponse(res, 'Class schedule deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

exports.createOverride = async (req, res, next) => {
  try {
    const data = await ClassesScheduleService.createOverride(req.user, req.body);
    return successResponse(res, 'Schedule override created successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getCalculatedSchedule = async (req, res, next) => {
  try {
    const { date, ...filters } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'date query parameter is required' });
    }
    const data = await ClassesScheduleService.getCalculatedSchedule(req.user, date, filters);
    return successResponse(res, 'Calculated schedule retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};
