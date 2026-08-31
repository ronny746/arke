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
    
    if (!filters.studentId) {
      if (!req.user.childrenIds || req.user.childrenIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No children linked to this parent account.' });
      }
      filters.studentId = { $in: req.user.childrenIds };
    } else {
      if (!req.user.childrenIds || !req.user.childrenIds.includes(filters.studentId)) {
        return res.status(403).json({ success: false, message: 'Unauthorized to view attendance for this student.' });
      }
    }

    const data = await AttendanceService.getAttendance(req.user, filters);
    return successResponse(res, 'Child attendance retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};
