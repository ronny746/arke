const AnalyticsReportsService = require('./analytics-reports.service');
const { successResponse } = require('../../common/responses');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const data = await AnalyticsReportsService.getDashboardStats(req.user);
    return successResponse(res, 'Dashboard stats retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getStudentPerformance = async (req, res, next) => {
  try {
    const studentId = req.params.studentId === 'me' ? req.user.userId : req.params.studentId;
    
    if (req.user.role === 'student' && studentId !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view this student\'s performance' });
    }

    const StudentAnalyticsService = require('./student-analytics.service');
    const data = await StudentAnalyticsService.getStudentPerformance(studentId);
    return successResponse(res, 'Student performance retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.queueReportGeneration = async (req, res, next) => {
  try {
    const data = await AnalyticsReportsService.queueReportGeneration(req.user, req.body);
    return successResponse(res, 'Report generation queued successfully', data, null, 202);
  } catch (error) {
    next(error);
  }
};

exports.getReportTasks = async (req, res, next) => {
  try {
    const data = await AnalyticsReportsService.getReportTasks(req.user);
    return successResponse(res, 'Report tasks retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};
