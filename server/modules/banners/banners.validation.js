const Joi = require('joi');

exports.createBannerSchema = Joi.object({
  title: Joi.string().optional().allow(''),
  imageUrl: Joi.string().required(),
  linkUrl: Joi.string().optional().allow(''),
  isActive: Joi.boolean().optional(),
  order: Joi.number().optional()
});

exports.updateBannerSchema = Joi.object({
  title: Joi.string().optional().allow(''),
  imageUrl: Joi.string().optional(),
  linkUrl: Joi.string().optional().allow(''),
  isActive: Joi.boolean().optional(),
  order: Joi.number().optional()
});
