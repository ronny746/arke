const Joi = require('joi');

const fieldValidation = Joi.object({
  id: Joi.string().required(),
  label: Joi.string().required(),
  type: Joi.string().valid('text', 'email', 'number', 'textarea', 'select', 'date').required(),
  required: Joi.boolean().default(false),
  options: Joi.array().items(Joi.string()).optional(),
  placeholder: Joi.string().allow('').optional()
});

exports.createFormSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow('').optional(),
  fields: Joi.array().items(fieldValidation).min(1).required(),
  successMessage: Joi.string().allow('').optional()
});

exports.updateFormSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().allow('').optional(),
  fields: Joi.array().items(fieldValidation).min(1).optional(),
  isActive: Joi.boolean().optional(),
  successMessage: Joi.string().allow('').optional()
});
