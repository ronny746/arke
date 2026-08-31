const Joi = require('joi');

exports.requestBackupSchema = Joi.object({
  type: Joi.string().valid('FULL', 'INCREMENTAL').optional()
});
