const { Assignment, AssignmentSubmission } = require('./assignments.model');

exports.createAssignment = async (reqUser, payload) => {
  const assignment = new Assignment({
    ...payload,
    instituteId: reqUser.instituteId,
    branchId: reqUser.branchId,
    teacherId: reqUser.userId
  });
  return await assignment.save();
};

exports.getAssignments = async (reqUser, filters) => {
  const query = { instituteId: reqUser.instituteId };

  if (reqUser.role === 'student') {
    const AcademicClassModel = require('../academic-classes/academic-classes.model');
    const studentClass = await AcademicClassModel.findOne({ students: reqUser.userId });
    if (studentClass) {
      query.classId = studentClass._id;
    } else {
      return []; // Student has no class assigned, so no assignments
    }
  } else if (filters.classId) {
    query.classId = filters.classId;
  }
  
  if (filters.subjectId) query.subjectId = filters.subjectId;
  
  return await Assignment.find(query)
    .populate('subjectId', 'name')
    .populate('teacherId', 'firstName lastName')
    .populate('classId', 'name')
    .sort({ dueDate: 1 });
};

exports.getChildSubmissions = async (studentIdsQuery) => {
  return await AssignmentSubmission.find({ studentId: studentIdsQuery });
};

exports.submitAssignment = async (assignmentId, reqUser, payload) => {
  const submissionData = {
    ...payload,
    assignmentId,
    studentId: reqUser.userId,
    status: 'submitted'
  };

  return await AssignmentSubmission.findOneAndUpdate(
    { assignmentId, studentId: reqUser.userId },
    submissionData,
    { new: true, upsert: true }
  );
};

exports.gradeSubmission = async (submissionId, payload) => {
  return await AssignmentSubmission.findByIdAndUpdate(
    submissionId,
    { ...payload, status: 'graded' },
    { new: true }
  );
};

exports.getSubmissionsByAssignment = async (assignmentId) => {
  return await AssignmentSubmission.find({ assignmentId }).populate('studentId', 'firstName lastName email');
};

exports.getMySubmissions = async (studentId) => {
  return await AssignmentSubmission.find({ studentId });
};
