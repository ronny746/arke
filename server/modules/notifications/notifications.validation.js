const Joi = require('joi');

exports.sendNotificationSchema = Joi.object({
  userId: Joi.string().required(),
  title: Joi.string().required(),
  message: Joi.string().required(),
  type: Joi.string().valid('INFO', 'ALERT', 'SUCCESS').optional()
});
