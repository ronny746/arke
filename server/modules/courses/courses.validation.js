const Joi = require('joi');

const validateCourseDateRange = (value, helpers) => {
  const start = value.startDate ? new Date(value.startDate) : null;
  const end = value.endDate ? new Date(value.endDate) : null;

  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start > end) {
    return helpers.message('Course start date must be on or before the end date.');
  }

  if (end && !Number.isNaN(end.getTime()) && end < new Date(new Date().setHours(0, 0, 0, 0))) {
    return helpers.message('Course end date cannot be in the past.');
  }

  return value;
};

exports.createCourseSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional().allow(''),
  tag: Joi.string().optional().allow(''),
  fee: Joi.number().optional().allow(null),
  actualFee: Joi.number().optional().allow(null),
  duration: Joi.string().optional().allow(''),
  startDate: Joi.date().optional().allow(null, ''),
  endDate: Joi.date().optional().allow(null, ''),
  subtitle: Joi.string().optional().allow(''),
  features: Joi.array().items(Joi.string()).optional(),
  bestFor: Joi.array().items(Joi.string()).optional(),
  color: Joi.string().optional().allow(''),
  isPublished: Joi.boolean().optional(),
  badge: Joi.string().optional().allow(''),
  popular: Joi.boolean().optional(),
  access: Joi.object({
    liveClasses: Joi.boolean().optional(),
    studyMaterials: Joi.boolean().optional(),
    dpps: Joi.boolean().optional(),
    testSeries: Joi.boolean().optional()
  }).optional(),
  defaultBatchId: Joi.string().optional().allow(null, ''),
  isActive: Joi.boolean().optional()
}).custom(validateCourseDateRange);

exports.updateCourseSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional().allow(''),
  tag: Joi.string().optional().allow(''),
  fee: Joi.number().optional().allow(null),
  actualFee: Joi.number().optional().allow(null),
  duration: Joi.string().optional().allow(''),
  startDate: Joi.date().optional().allow(null, ''),
  endDate: Joi.date().optional().allow(null, ''),
  subtitle: Joi.string().optional().allow(''),
  features: Joi.array().items(Joi.string()).optional(),
  bestFor: Joi.array().items(Joi.string()).optional(),
  color: Joi.string().optional().allow(''),
  isPublished: Joi.boolean().optional(),
  badge: Joi.string().optional().allow(''),
  popular: Joi.boolean().optional(),
  access: Joi.object({
    liveClasses: Joi.boolean().optional(),
    studyMaterials: Joi.boolean().optional(),
    dpps: Joi.boolean().optional(),
    testSeries: Joi.boolean().optional()
  }).optional(),
  defaultBatchId: Joi.string().optional().allow(null, ''),
  isActive: Joi.boolean().optional()
}).custom(validateCourseDateRange);
