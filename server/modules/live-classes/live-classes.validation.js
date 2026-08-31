const Joi = require('joi');

exports.startLiveClassSchema = Joi.object({
  classScheduleId: Joi.string().required(),
  platform: Joi.string().valid('zoom', 'custom').default('zoom'),
  meetingLink: Joi.string().uri().allow('').optional(),
  meetingPassword: Joi.string().allow('').optional()
});

exports.endLiveClassSchema = Joi.object({
  recordingUrl: Joi.string().uri().optional()
});
