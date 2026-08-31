const Joi = require('joi');

exports.updateConfigSchema = Joi.object({
  academicYear: Joi.string().required(),
  activeTerm: Joi.string().optional(),
  preferences: Joi.object().optional()
});
