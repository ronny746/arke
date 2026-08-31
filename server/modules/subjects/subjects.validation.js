const Joi = require('joi');

exports.createSubjectSchema = Joi.object({
  batchId: Joi.string().required(),
  name: Joi.string().required(),
  code: Joi.string().optional().allow(''),
  teacherId: Joi.string().optional(),
  description: Joi.string().optional().allow(''),
  credits: Joi.number().optional()
});

exports.updateSubjectSchema = Joi.object({
  name: Joi.string().optional(),
  code: Joi.string().optional().allow(''),
  teacherId: Joi.string().optional(),
  description: Joi.string().optional().allow(''),
  credits: Joi.number().optional(),
  isActive: Joi.boolean().optional()
});

exports.getSubjectsSchema = Joi.object({
  instituteId: Joi.string().optional()
});
