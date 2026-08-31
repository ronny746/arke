const Joi = require('joi');

exports.addItemSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid('BOOK', 'UNIFORM', 'LAPTOP', 'OTHER').required(),
  stockCount: Joi.number().min(0).required(),
  price: Joi.number().min(0).optional()
});

exports.issueItemSchema = Joi.object({
  itemId: Joi.string().required(),
  studentId: Joi.string().required(),
  dueDate: Joi.date().iso().optional()
});
