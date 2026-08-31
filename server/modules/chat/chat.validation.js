const Joi = require('joi');

exports.createRoomSchema = Joi.object({
  type: Joi.string().valid('DIRECT', 'GROUP').required(),
  name: Joi.string().when('type', { is: 'GROUP', then: Joi.required(), otherwise: Joi.optional() }),
  participantIds: Joi.array().items(Joi.string()).min(1).required(),
  metadata: Joi.object().optional()
});

exports.sendMessageSchema = Joi.object({
  content: Joi.string().optional(),
  attachments: Joi.array().items(Joi.string()).optional()
}).or('content', 'attachments');
