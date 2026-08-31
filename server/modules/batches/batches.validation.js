const Joi = require('joi');

exports.createBatchSchema = Joi.object({
  name: Joi.string().required(),
  section: Joi.string().optional().allow(''),
  type: Joi.string().valid('online', 'offline', 'hybrid').optional(),
  description: Joi.string().optional().allow(''),
  courseId: Joi.string().optional(),
  batchTeacherId: Joi.string().optional(),
  teachers: Joi.array().items(Joi.string()).optional(),
  students: Joi.array().items(Joi.string()).optional()
});

exports.updateBatchSchema = Joi.object({
  name: Joi.string().optional(),
  section: Joi.string().optional().allow(''),
  type: Joi.string().valid('online', 'offline', 'hybrid').optional(),
  description: Joi.string().optional().allow(''),
  courseId: Joi.string().optional(),
  batchTeacherId: Joi.string().optional(),
  teachers: Joi.array().items(Joi.string()).optional(),
  students: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional()
});

exports.assignSchema = Joi.object({
  userIds: Joi.array().items(Joi.string().required()).min(1).required(),
  roleInBatch: Joi.string().valid('student', 'teacher').required()
});

exports.bulkAssignClassSchema = Joi.object({
  targetClass: Joi.string().required(),
  targetSection: Joi.string().optional().allow('')
});

exports.joinSchema = Joi.object({
  batchId: Joi.string().required()
});

exports.getBatchesSchema = Joi.object({
  instituteId: Joi.string().optional(),
  courseId: Joi.string().optional()
});
