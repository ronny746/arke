const TestsExamsService = require('./tests-exams.service');
const { successResponse } = require('../../common/responses');

exports.createExam = async (req, res, next) => {
  try {
    const data = await TestsExamsService.createExam(req.user, req.body);
    return successResponse(res, 'Exam scheduled successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getExams = async (req, res, next) => {
  try {
    const data = await TestsExamsService.getExams(req.user, req.query);
    return successResponse(res, 'Exams retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};
