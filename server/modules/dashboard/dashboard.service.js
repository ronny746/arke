const UserModel = require('../users/users.model');
const AttendanceModel = require('../attendance/attendance.model');
const InstituteModel = require('../institutes/institutes.model');
const { ROLES } = require('../../config/constants');

exports.getDashboardData = async (reqUser) => {
  const role = reqUser.role;
  const instituteId = reqUser.instituteId;

  // SUPER SUPER ADMIN Dashboard (Global View)
  if (role === ROLES.SUPER_SUPER_ADMIN) {
    const totalInstitutes = await InstituteModel.countDocuments();
    const activeInstitutes = await InstituteModel.countDocuments({ isActive: true });
    const totalStudentsPlatformWide = await UserModel.countDocuments({ role: ROLES.STUDENT });
    const totalTeachersPlatformWide = await UserModel.countDocuments({ role: ROLES.TEACHER });
    const recentInstitutes = await InstituteModel.find().sort({ createdAt: -1 }).limit(5);

    return {
      overview: {
        totalInstitutes,
        activeInstitutes,
        totalStudentsPlatformWide,
        totalTeachersPlatformWide
      },
      recentInstitutes,
      platformRevenuePlaceholder: 500000 // Placeholder for future integration
    };
  }

  // Mock aggregated data depending on role
  if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN_OPERATIONS || role === ROLES.ADMIN_ACADOPS) {
    const totalStudents = await UserModel.countDocuments({ instituteId, role: ROLES.STUDENT });
    const totalTeachers = await UserModel.countDocuments({ instituteId, role: ROLES.TEACHER });
    return {
      overview: { totalStudents, totalTeachers, activeClassesToday: 15 },
      recentActivity: [],
      pendingTasks: []
    };
  }

  if (role === ROLES.TEACHER) {
    return {
      upcomingClasses: [], // Normally queried from classes-schedule
      pendingAssignmentsToGrade: 5,
      unreadMessages: 2
    };
  }

  if (role === ROLES.STUDENT) {
    return {
      todaysClasses: [], // From classes-schedule
      pendingHomework: 3,
      recentTestScores: []
    };
  }

  if (role === ROLES.PARENT) {
    const parentUser = await UserModel.findById(reqUser.userId).populate('childrenIds', 'firstName lastName profilePictureUrl email');
    return {
      wards: parentUser.childrenIds || [],
      children: parentUser.childrenIds || [], // Ensure children is returned for frontend compatibility
      pendingFees: 1200, // From fees-payments
      recentNotices: []
    };
  }

  return { message: 'Welcome to the Dashboard' };
};
