const Joi = require('joi');

exports.createSubjectSchema = Joi.object({
  batchId: Joi.string().optional().allow('', null),
  name: Joi.string().required(),
  icon: Joi.string().optional().allow('', null),
  code: Joi.string().optional().allow(''),
  teacherId: Joi.string().optional().allow('', null),
  description: Joi.string().optional().allow(''),
  chaptersCount: Joi.number().optional().allow(null),
  dppsCount: Joi.number().optional().allow(null),
  testsCount: Joi.number().optional().allow(null),
  topics: Joi.array().items(Joi.string()).optional(),
  credits: Joi.number().optional(),
  isLibrarySubject: Joi.boolean().optional()
});

exports.updateSubjectSchema = Joi.object({
  name: Joi.string().optional(),
  icon: Joi.string().optional().allow('', null),
  code: Joi.string().optional().allow(''),
  teacherId: Joi.string().optional().allow('', null),
  description: Joi.string().optional().allow(''),
  chaptersCount: Joi.number().optional().allow(null),
  dppsCount: Joi.number().optional().allow(null),
  testsCount: Joi.number().optional().allow(null),
  topics: Joi.array().items(Joi.string()).optional(),
  credits: Joi.number().optional(),
  isLibrarySubject: Joi.boolean().optional(),
  isActive: Joi.boolean().optional()
});

exports.getSubjectsSchema = Joi.object({
  instituteId: Joi.string().optional(),
  libraryOnly: Joi.boolean().optional()
});
