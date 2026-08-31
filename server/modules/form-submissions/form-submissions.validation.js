const Joi = require('joi');

exports.submitFormSchema = Joi.object({
  data: Joi.array().items(
    Joi.object({
      fieldId: Joi.string().required(),
      label: Joi.string().required(),
      value: Joi.any().required()
    })
  ).min(1).required()
});

exports.updateStatusSchema = Joi.object({
  status: Joi.string().valid('NEW', 'IN_PROGRESS', 'CONVERTED', 'REJECTED').required(),
  assignedTo: Joi.string().allow('').optional()
});
