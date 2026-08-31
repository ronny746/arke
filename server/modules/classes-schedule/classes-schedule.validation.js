const Joi = require('joi');

exports.createScheduleSchema = Joi.object({
  batchId: Joi.string().required(),
  subjectId: Joi.string().optional().allow(null, ''),
  teacherId: Joi.string().required(),
  roomId: Joi.string().optional().allow(null, ''),
  dayOfWeek: Joi.number().min(0).max(6).required(),
  startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
  endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
  isRecurring: Joi.boolean().optional(),
  startDate: Joi.date().iso().optional().allow(null, ''),
  endDate: Joi.date().iso().optional().allow(null, '')
});

exports.getScheduleSchema = Joi.object({
  batchId: Joi.string().optional(),
  teacherId: Joi.string().optional(),
  dayOfWeek: Joi.number().min(0).max(6).optional(),
  date: Joi.date().iso().optional(),
  instituteId: Joi.string().optional()
});

exports.createOverrideSchema = Joi.object({
  recurringScheduleId: Joi.string().optional().allow(null),
  teacherId: Joi.string().required(),
  batchId: Joi.string().required(),
  subjectId: Joi.string().optional().allow(null, ''),
  overrideDate: Joi.date().iso().required(),
  overrideType: Joi.string().valid('CANCELLED', 'RESCHEDULED', 'EXTRA_CLASS').required(),
  newStartTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().allow(null, ''),
  newEndTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().allow(null, ''),
  reason: Joi.string().optional().allow(null, '')
});

exports.getCalculatedScheduleSchema = Joi.object({
  date: Joi.date().iso().required(),
  batchId: Joi.string().optional(),
  teacherId: Joi.string().optional(),
  instituteId: Joi.string().optional()
});
