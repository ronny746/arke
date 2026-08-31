const Joi = require('joi');

exports.generateFeeSchema = Joi.object({
  studentId: Joi.string().required(),
  feeType: Joi.string().valid('TUITION', 'TRANSPORT', 'EXAM', 'OTHER').optional(),
  amountDue: Joi.number().min(1).required(),
  dueDate: Joi.date().iso().required()
});

exports.processPaymentSchema = Joi.object({
  feeRecordId: Joi.string().required(),
  amountPaid: Joi.number().min(1).required(),
  paymentMethod: Joi.string().valid('CASH', 'CARD', 'UPI', 'BANK_TRANSFER').required(),
  transactionId: Joi.string().required()
});
