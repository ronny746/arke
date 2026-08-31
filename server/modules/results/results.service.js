const Result = require('./results.model');

exports.submitResult = async (reqUser, payload) => {
  return await Result.findOneAndUpdate(
    { instituteId: reqUser.instituteId, examId: payload.examId, studentId: payload.studentId },
    { ...payload },
    { new: true, upsert: true } // Overwrite if existing
  );
};

exports.getResults = async (reqUser, filters) => {
  const query = { instituteId: reqUser.instituteId };
  if (filters.examId) query.examId = filters.examId;
  if (filters.studentId) query.studentId = filters.studentId;

  return await Result.find(query).populate('examId').sort({ createdAt: -1 });
};
