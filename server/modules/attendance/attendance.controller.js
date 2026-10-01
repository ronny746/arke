const AttendanceService = require('./attendance.service');
const { successResponse } = require('../../common/responses');

exports.markAttendance = async (req, res, next) => {
  try {
    const data = await AttendanceService.markAttendance(req.user, req.body);
    return successResponse(res, 'Attendance marked successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.geoCheckin = async (req, res, next) => {
  try {
    const data = await AttendanceService.geoCheckin(req.user, req.body);
    return successResponse(res, 'Checked in successfully via Geo-location', data);
  } catch (error) {
    next(error);
  }
};

exports.liveClassCheckin = async (req, res, next) => {
  try {
    const data = await AttendanceService.liveClassCheckin(req.user, req.body);
    return successResponse(res, 'Live class attendance recorded', data);
  } catch (error) {
    next(error);
  }
};

exports.getAttendance = async (req, res, next) => {
  try {
    const data = await AttendanceService.getAttendance(req.user, req.query);
    return successResponse(res, 'Attendance retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getChildAttendance = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    const User = require('../users/users.model');
    const parent = await User.findById(req.user.userId).select('childrenIds').lean();
    const childIds = (parent?.childrenIds || []).map(id => id.toString());
    
    if (!filters.studentId) {
      if (childIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No children linked to this parent account.' });
      }
      filters.studentId = { $in: childIds };
    } else {
      if (!childIds.includes(filters.studentId.toString())) {
        return res.status(403).json({ success: false, message: 'Unauthorized to view attendance for this student.' });
      }
    }

    const data = await AttendanceService.getAttendance(req.user, filters);
    return successResponse(res, 'Child attendance retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};
