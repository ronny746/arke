const Joi = require('joi');

exports.createInstituteSchema = Joi.object({
  name: Joi.string().required(),
  domain: Joi.string().optional(),
  subdomain: Joi.string().required(),
  planType: Joi.string().valid('free', 'basic', 'premium', 'enterprise').optional(),
  contactEmail: Joi.string().email().required(),
  contactPhone: Joi.string().optional(),
  address: Joi.string().optional(),
  adminFirstName: Joi.string().required(),
  adminLastName: Joi.string().required(),
  adminEmail: Joi.string().email().required(),
  adminPassword: Joi.string().min(6).required(),
  branches: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    code: Joi.string().optional(),
    address: Joi.string().optional(),
    contactEmail: Joi.string().email().optional(),
    contactPhone: Joi.string().optional()
  })).optional()
});

exports.updateInstituteSchema = Joi.object({
  name: Joi.string().optional(),
  domain: Joi.string().optional(),
  subdomain: Joi.string().optional(),
  logoUrl: Joi.string().optional(),
  planType: Joi.string().valid('free', 'basic', 'premium', 'enterprise').optional(),
  contactEmail: Joi.string().email().optional(),
  contactPhone: Joi.string().optional(),
  address: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  settings: Joi.object().optional()
});
