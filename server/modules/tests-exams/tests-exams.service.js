const Exam = require('./tests-exams.model');

exports.createExam = async (reqUser, payload) => {
  const exam = new Exam({
    ...payload,
    instituteId: reqUser.instituteId,
    teacherId: reqUser.userId
  });
  return await exam.save();
};

exports.getExams = async (reqUser, filters) => {
  const query = { instituteId: reqUser.instituteId };
  if (filters.classId) query.classId = filters.classId;
  if (filters.subjectId) query.subjectId = filters.subjectId;
  if (filters.type) query.type = filters.type;

  return await Exam.find(query).sort({ examDate: 1 });
};
