const ReportTask = require('./analytics-reports.model');
const UserModel = require('../users/users.model');
const AttendanceModel = require('../attendance/attendance.model');
const { Assignment, AssignmentSubmission } = require('../assignments/assignments.model');

// Mock dashboard stats aggregation
exports.getDashboardStats = async (reqUser) => {
  const query = { instituteId: reqUser.instituteId };
  
  const totalStudents = await UserModel.countDocuments({ ...query, role: 'student' });
  const totalTeachers = await UserModel.countDocuments({ ...query, role: 'teacher' });
  
  // Get today's attendance summary (just an example of complex agg placeholder)
  const today = new Date();
  today.setHours(0,0,0,0);
  const attendanceToday = await AttendanceModel.countDocuments({ ...query, date: today });
  
  const totalAssignments = await Assignment.countDocuments(query);

  return {
    totalStudents,
    totalTeachers,
    attendanceLogsToday: attendanceToday,
    totalAssignments
  };
};

exports.queueReportGeneration = async (reqUser, payload) => {
  const task = new ReportTask({
    instituteId: reqUser.instituteId,
    requestedBy: reqUser.userId,
    reportType: payload.reportType,
    criteria: payload.criteria
  });

  await task.save();

  // In a real app, you would publish to a message broker (RabbitMQ, SQS) here
  // to trigger a background worker.
  
  return task;
};

exports.getReportTasks = async (reqUser) => {
  return await ReportTask.find({ instituteId: reqUser.instituteId }).sort({ createdAt: -1 });
};
