const Joi = require('joi');

exports.sendNotificationSchema = Joi.object({
  userId: Joi.string().required(),
  title: Joi.string().required(),
  message: Joi.string().required(),
  type: Joi.string().valid('INFO', 'ALERT', 'SUCCESS').optional()
});

exports.registerPushDeviceSchema = Joi.object({
  token: Joi.string().trim().min(20).required(),
  platform: Joi.string().valid('android', 'ios').required(),
  appVersion: Joi.string().max(40).allow('').optional()
});

exports.broadcastNotificationSchema = Joi.object({
  audience: Joi.string().valid('all_students', 'all_parents', 'batch_students', 'batch_families', 'student', 'parent').required(),
  batchId: Joi.when('audience', { is: Joi.valid('batch_students', 'batch_families'), then: Joi.string().required(), otherwise: Joi.forbidden() }),
  userId: Joi.when('audience', { is: Joi.valid('student', 'parent'), then: Joi.string().required(), otherwise: Joi.forbidden() }),
  title: Joi.string().trim().min(3).max(100).required(),
  message: Joi.string().trim().min(3).max(1000).required(),
  type: Joi.string().valid('INFO', 'ALERT', 'SUCCESS').default('INFO')
});
