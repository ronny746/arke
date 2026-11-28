const Joi = require('joi');

exports.updateConfigSchema = Joi.object({
  academicYear: Joi.string().optional(),
  activeTerm: Joi.string().optional(),
  preferences: Joi.object().optional(),
  authSettings: Joi.object({
    enableRollNumberLogin: Joi.boolean().optional(),
    enableStudentPasswordLogin: Joi.boolean().optional()
  }).unknown(true).optional(),
  performanceSettings: Joi.object({
    redBelow: Joi.number().min(0).max(99).optional(),
    yellowBelow: Joi.number().min(1).max(100).optional()
  }).optional(),
  appUpdate: Joi.object({
    latestVersion: Joi.string().optional().allow('', null),
    minRequiredVersion: Joi.string().optional().allow('', null),
    isMandatory: Joi.boolean().optional(),
    updateUrl: Joi.string().optional().allow('', null),
    updateNotes: Joi.string().optional().allow('', null)
  }).unknown(true).optional(),
  jeePercentileConfig: Joi.object({
    table: Joi.array().items(Joi.object({
      marks: Joi.number().min(-300).max(300).required(),
      percentile: Joi.number().min(0).max(100).required()
    })).max(100).optional(),
    gValues: Joi.object({
      1: Joi.number().greater(0).max(5).optional(),
      2: Joi.number().greater(0).max(5).optional(),
      3: Joi.number().greater(0).max(5).optional(),
      4: Joi.number().greater(0).max(5).optional(),
      5: Joi.number().greater(0).max(5).optional()
    }).optional()
  }).optional(),
  neetExamConfig: Joi.object({
    examTitle: Joi.string().optional().allow('', null),
    examDate: Joi.date().iso().optional().allow(null, ''),
    targetDateLabel: Joi.string().optional().allow('', null),
    isTentative: Joi.boolean().optional(),
    startDate: Joi.date().iso().optional().allow(null, ''),
    subtitle: Joi.string().optional().allow('', null),
    daysLabel: Joi.string().optional().allow('', null)
  }).unknown(true).optional()
}).unknown(true);
