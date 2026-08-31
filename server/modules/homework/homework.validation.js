const Joi = require('joi');

exports.createHomeworkSchema = Joi.object({
  classId: Joi.string().required(),
  subjectId: Joi.string().required(),
  title: Joi.string().required(),
  description: Joi.string().optional(),
  dueDate: Joi.date().iso().required()
});
