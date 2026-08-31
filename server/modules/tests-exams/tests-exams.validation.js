const Joi = require('joi');

exports.createExamSchema = Joi.object({
  title: Joi.string().required(),
  batchId: Joi.string().required(),
  subjectId: Joi.string().required(),
  type: Joi.string().valid('UNIT_TEST', 'MID_TERM', 'FINAL').required(),
  examDate: Joi.date().iso().required(),
  totalMarks: Joi.number().min(1).required()
});
