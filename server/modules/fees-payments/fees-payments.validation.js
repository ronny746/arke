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

exports.createCustomPlanSchema = Joi.object({
  studentId: Joi.string().required(),
  courseId: Joi.string().required(),
  batchId: Joi.string().optional().allow('', null),
  totalCoursePrice: Joi.number().min(1).required(),
  notes: Joi.string().optional().allow(''),
  installments: Joi.array().items(
    Joi.object({
      installmentNumber: Joi.number().integer().min(1).required(),
      title: Joi.string().optional().allow(''),
      amount: Joi.number().min(1).required(),
      dueDate: Joi.date().iso().required(),
      remarks: Joi.string().optional().allow('')
    })
  ).min(1).required()
});

exports.recordOfflinePaymentSchema = Joi.object({
  feeRecordId: Joi.string().required(),
  installmentNumber: Joi.number().integer().min(1).required(),
  amountPaid: Joi.number().min(1).required(),
  paymentMethod: Joi.string().valid('CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER').required(),
  transactionId: Joi.string().optional().allow(''),
  paidAt: Joi.date().iso().optional(),
  remarks: Joi.string().optional().allow('')
});

exports.sendReminderSchema = Joi.object({
  feeRecordId: Joi.string().required(),
  installmentNumber: Joi.number().integer().min(1).optional()
});

