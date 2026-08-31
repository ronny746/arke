const Joi = require('joi');

exports.createClassSchema = Joi.object({
  name: Joi.string().required(),
  section: Joi.string().optional().allow(''),
  type: Joi.string().valid('online', 'offline', 'hybrid').optional(),
  classTeacherId: Joi.string().optional(),
  students: Joi.array().items(Joi.string()).optional()
});

exports.updateClassSchema = Joi.object({
  name: Joi.string().optional(),
  section: Joi.string().optional().allow(''),
  type: Joi.string().valid('online', 'offline', 'hybrid').optional(),
  classTeacherId: Joi.string().optional(),
  students: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional()
});

exports.assignSchema = Joi.object({
  userIds: Joi.array().items(Joi.string().required()).min(1).required(),
  roleInClass: Joi.string().valid('student', 'teacher').required()
});

exports.joinSchema = Joi.object({
  classId: Joi.string().required()
});

exports.getClassesSchema = Joi.object({
  instituteId: Joi.string().optional()
});
