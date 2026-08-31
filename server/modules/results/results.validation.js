const Joi = require('joi');

exports.submitResultSchema = Joi.object({
  examId: Joi.string().required(),
  studentId: Joi.string().required(),
  marksObtained: Joi.number().min(0).required(),
  grade: Joi.string().required(),
  remarks: Joi.string().optional()
});
