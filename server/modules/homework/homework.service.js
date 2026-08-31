const { Homework, HomeworkSubmission } = require('./homework.model');

exports.createHomework = async (reqUser, payload) => {
  const homework = new Homework({
    ...payload,
    instituteId: reqUser.instituteId,
    teacherId: reqUser.userId
  });
  return await homework.save();
};

exports.getHomework = async (reqUser, filters) => {
  const query = { instituteId: reqUser.instituteId };
  if (reqUser.role === 'student') {
    const AcademicClassModel = require('../academic-classes/academic-classes.model');
    const studentClass = await AcademicClassModel.findOne({ students: reqUser.userId });
    if (studentClass) {
      query.classId = studentClass._id;
    } else {
      return [];
    }
  } else if (filters.classId) {
    query.classId = filters.classId;
  }
  if (filters.subjectId) query.subjectId = filters.subjectId;

  return await Homework.find(query).sort({ dueDate: 1 });
};

exports.submitHomework = async (homeworkId, reqUser) => {
  return await HomeworkSubmission.findOneAndUpdate(
    { homeworkId, studentId: reqUser.userId },
    { status: 'SUBMITTED' },
    { new: true, upsert: true }
  );
};
