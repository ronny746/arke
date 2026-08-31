const Joi = require('joi');

exports.configureIntegrationSchema = Joi.object({
  provider: Joi.string().valid('ZOOM', 'STRIPE', 'RAZORPAY', 'TWILIO', 'WHATSAPP').required(),
  apiKey: Joi.string().required(),
  apiSecret: Joi.string().optional(),
  webhookUrl: Joi.string().uri().optional(),
  isActive: Joi.boolean().optional()
});
