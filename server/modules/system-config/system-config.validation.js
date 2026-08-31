const Joi = require('joi');

exports.updateConfigSchema = Joi.object({
  academicYear: Joi.string().optional(),
  activeTerm: Joi.string().optional(),
  preferences: Joi.object().optional(),
  authSettings: Joi.object({
    enableRollNumberLogin: Joi.boolean().optional()
  }).unknown(true).optional(),
  appUpdate: Joi.object({
    latestVersion: Joi.string().optional().allow('', null),
    minRequiredVersion: Joi.string().optional().allow('', null),
    isMandatory: Joi.boolean().optional(),
    updateUrl: Joi.string().optional().allow('', null),
    updateNotes: Joi.string().optional().allow('', null)
  }).unknown(true).optional(),
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
