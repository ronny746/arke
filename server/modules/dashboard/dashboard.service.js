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
    
    // Total exams
    const TestExamModel = require('../tests-exams/tests-exams.model');
    const totalExams = await TestExamModel.countDocuments({ instituteId });
    
    // Live Classes Today
    const ClassScheduleModel = require('../classes-schedule/classes-schedule.model');
    const today = new Date().getDay();
    const activeClassesToday = await ClassScheduleModel.countDocuments({ instituteId, dayOfWeek: today, isActive: true });
    
    // Recent Activity (Mocked real data using last few users and exams)
    const recentActivity = [];
    
    const recentStudents = await UserModel.find({ instituteId, role: ROLES.STUDENT })
      .sort({ createdAt: -1 })
      .limit(3);
      
    recentStudents.forEach(s => {
      recentActivity.push({
        text: `New student ${s.firstName} ${s.lastName} enrolled`,
        time: s.createdAt,
        type: 'student'
      });
    });
    
    const recentExams = await TestExamModel.find({ instituteId })
      .sort({ createdAt: -1 })
      .limit(3);
      
    recentExams.forEach(e => {
      recentActivity.push({
        text: `New exam "${e.title}" created`,
        time: e.createdAt,
        type: 'exam'
      });
    });
    
    // Sort combined activities by date descending
    recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    // Format time for frontend
    const formatTimeAgo = (date) => {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      let interval = seconds / 31536000;
      if (interval > 1) return Math.floor(interval) + " years ago";
      interval = seconds / 2592000;
      if (interval > 1) return Math.floor(interval) + " months ago";
      interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + " days ago";
      interval = seconds / 3600;
      if (interval > 1) return Math.floor(interval) + " hours ago";
      interval = seconds / 60;
      if (interval > 1) return Math.floor(interval) + " minutes ago";
      return Math.floor(seconds) + " seconds ago";
    };
    
    recentActivity.forEach(a => a.time = formatTimeAgo(a.time));
    // Batch Performance (Real batches & student counts)
    const BatchModel = require('../batches/batches.model');
    const allBatches = await BatchModel.find({ instituteId }).sort({ updatedAt: -1 });
    const ResultModel = require('../results/results.model');
    const ExamModel = require('../tests-exams/tests-exams.model');
    
    const colors = ['#0033a0', '#7b3fa0', '#059669', '#e8470a'];
    
    const batchPerformance = await Promise.all(allBatches.map(async (b, idx) => {
      let avg = 0;
      
      const exams = await ExamModel.find({ batchId: b._id, instituteId });
      if (exams.length > 0) {
        let totalScorePercentage = 0;
        let totalResultsCount = 0;

        for (const exam of exams) {
          if (exam.totalMarks > 0) {
            const results = await ResultModel.find({ examId: exam._id });
            for (const res of results) {
              const percentage = (res.marksObtained / exam.totalMarks) * 100;
              totalScorePercentage += percentage;
              totalResultsCount++;
            }
          }
        }
        
        if (totalResultsCount > 0) {
          avg = Math.round(totalScorePercentage / totalResultsCount);
        }
      }

      return {
        batch: `${b.name} ${b.section ? '- ' + b.section : ''}`,
        students: b.students ? b.students.length : 0,
        avg, 
        color: colors[idx % colors.length]
      };
    }));

    return {
      overview: { totalStudents, totalTeachers, activeClassesToday, totalExams },
      recentActivity: recentActivity.slice(0, 5), // Only take top 5
      batchPerformance,
      pendingTasks: []
    };
  }

  if (role === ROLES.TEACHER) {
    const totalStudents = await UserModel.countDocuments({ instituteId, role: ROLES.STUDENT });
    const ClassScheduleModel = require('../classes-schedule/classes-schedule.model');
    const ResourceModel = require('../resources/resources.model');
    const TestExamModel = require('../tests-exams/tests-exams.model');

    const totalClasses = await ClassScheduleModel.countDocuments({ instituteId, teacherId: reqUser.userId });
    const materialsUploaded = await ResourceModel.countDocuments({ instituteId, uploadedBy: reqUser.userId });
    const totalExams = await TestExamModel.countDocuments({ instituteId, createdBy: reqUser.userId });

    return {
      totalStudents,
      totalClasses,
      materialsUploaded,
      totalExams,
      upcomingClasses: [], // Can be populated dynamically if needed
      topStudents: [] // Can be populated dynamically if needed
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
