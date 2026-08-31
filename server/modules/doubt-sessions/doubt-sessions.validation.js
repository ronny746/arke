const Joi = require('joi');

exports.requestSessionSchema = Joi.object({
  teacherId: Joi.string().required(),
  subjectId: Joi.string().optional(),
  topic: Joi.string().required(),
  description: Joi.string().optional()
});

exports.scheduleSessionSchema = Joi.object({
  scheduledAt: Joi.date().iso().required(),
  meetingLink: Joi.string().uri().optional()
});

exports.resolveSessionSchema = Joi.object({
  resolutionNotes: Joi.string().required()
});
