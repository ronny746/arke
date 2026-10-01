const Batch = require('../batches/batches.model');
const User = require('../users/users.model');

// activeSessionId preserves visibility for people who signed in before
// lastLoginAt was introduced. Every new successful sign-in sets lastLoginAt.
exports.loggedInStudentFilter = instituteId => ({
  instituteId,
  role: 'student',
  isActive: true,
  $or: [
    { lastLoginAt: { $ne: null } },
    { activeSessionId: { $exists: true, $ne: null } }
  ]
});

exports.getLoggedInWithoutCourse = async ({ instituteId }) => {
  const enrolledStudentIds = await Batch.distinct('students', { instituteId });
  const query = exports.loggedInStudentFilter(instituteId);
  if (enrolledStudentIds.length) query._id = { $nin: enrolledStudentIds };

  const students = await User.find(query)
    .select('firstName lastName email phone metadata lastLoginAt createdAt')
    .sort({ lastLoginAt: -1, createdAt: -1 })
    .lean();

  return students.map(student => ({
    ...student,
    source: 'LOGGED_IN_NO_COURSE',
    displayName: [student.firstName, student.lastName].filter(Boolean).join(' ').trim() || 'Student'
  }));
};
