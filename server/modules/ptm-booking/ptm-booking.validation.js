const Joi = require('joi');

exports.createSlotSchema = Joi.object({
  date: Joi.string().required(),
  startTime: Joi.string().required(),
  endTime: Joi.string().required(),
  durationMinutes: Joi.number().min(5).max(120).required()
});

exports.bookSlotSchema = Joi.object({
  slotId: Joi.string().required(),
  studentId: Joi.string().required()
});
