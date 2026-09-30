const Joi = require('joi');

const validateCourseDateRange = (value, helpers) => {
  const start = value.startDate ? new Date(value.startDate) : null;
  const end = value.endDate ? new Date(value.endDate) : null;

  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start > end) {
    return helpers.message('Course start date must be on or before the end date.');
  }

  return value;
};

exports.createCourseSchema = Joi.object({
  name: Joi.string().required().messages({
    'string.empty': 'Course name is required',
    'any.required': 'Course name is required'
  }),
  description: Joi.string().optional().allow('', null),
  tag: Joi.string().optional().allow('', null),
  fee: Joi.number().optional().allow(null),
  actualFee: Joi.number().optional().allow(null),
  duration: Joi.string().optional().allow('', null),
  startDate: Joi.date().optional().allow(null, ''),
  endDate: Joi.date().optional().allow(null, ''),
  subtitle: Joi.string().optional().allow('', null),
  features: Joi.array().items(Joi.string().allow('')).optional(),
  bestFor: Joi.array().items(Joi.string().allow('')).optional(),
  color: Joi.string().optional().allow('', null),
  isPublished: Joi.boolean().optional(),
  badge: Joi.string().optional().allow('', null),
  popular: Joi.boolean().optional(),
  targetExam: Joi.string().optional().allow('', 'ALL', null),
  targetExams: Joi.array().items(Joi.string()).optional(),
  targetClass: Joi.string().optional().allow('', 'ALL', null),
  targetClasses: Joi.array().items(Joi.string()).optional(),
  medium: Joi.string().optional().allow('', 'ALL', null),
  access: Joi.object({
    liveClasses: Joi.boolean().optional(),
    studyMaterials: Joi.boolean().optional(),
    dpps: Joi.boolean().optional(),
    testSeries: Joi.boolean().optional()
  }).optional(),
  defaultBatchId: Joi.string().optional().allow(null, ''),
  faculties: Joi.array().items(Joi.string()).optional(),
  subjects: Joi.array().items(Joi.object({
    _id: Joi.string().optional(),
    name: Joi.string().required(),
    icon: Joi.string().optional().allow('', null),
    teacherId: Joi.string().optional().allow('', null),
    chaptersCount: Joi.number().optional().allow(null),
    dppsCount: Joi.number().optional().allow(null),
    testsCount: Joi.number().optional().allow(null),
    description: Joi.string().optional().allow('', null),
    topics: Joi.array().items(Joi.string().allow('')).optional()
  })).optional(),
  faqs: Joi.array().items(Joi.object({
    _id: Joi.string().optional(),
    question: Joi.string().required(),
    answer: Joi.string().required()
  })).optional(),
  isActive: Joi.boolean().optional()
}).unknown(true).custom(validateCourseDateRange);

exports.updateCourseSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional().allow('', null),
  tag: Joi.string().optional().allow('', null),
  fee: Joi.number().optional().allow(null),
  actualFee: Joi.number().optional().allow(null),
  duration: Joi.string().optional().allow('', null),
  startDate: Joi.date().optional().allow(null, ''),
  endDate: Joi.date().optional().allow(null, ''),
  subtitle: Joi.string().optional().allow('', null),
  features: Joi.array().items(Joi.string().allow('')).optional(),
  bestFor: Joi.array().items(Joi.string().allow('')).optional(),
  color: Joi.string().optional().allow('', null),
  isPublished: Joi.boolean().optional(),
  badge: Joi.string().optional().allow('', null),
  popular: Joi.boolean().optional(),
  targetExam: Joi.string().optional().allow('', 'ALL', null),
  targetExams: Joi.array().items(Joi.string()).optional(),
  targetClass: Joi.string().optional().allow('', 'ALL', null),
  targetClasses: Joi.array().items(Joi.string()).optional(),
  medium: Joi.string().optional().allow('', 'ALL', null),
  access: Joi.object({
    liveClasses: Joi.boolean().optional(),
    studyMaterials: Joi.boolean().optional(),
    dpps: Joi.boolean().optional(),
    testSeries: Joi.boolean().optional()
  }).optional(),
  defaultBatchId: Joi.string().optional().allow(null, ''),
  faculties: Joi.array().items(Joi.string()).optional(),
  subjects: Joi.array().items(Joi.object({
    _id: Joi.string().optional(),
    name: Joi.string().required(),
    icon: Joi.string().optional().allow('', null),
    teacherId: Joi.string().optional().allow('', null),
    chaptersCount: Joi.number().optional().allow(null),
    dppsCount: Joi.number().optional().allow(null),
    testsCount: Joi.number().optional().allow(null),
    description: Joi.string().optional().allow('', null),
    topics: Joi.array().items(Joi.string().allow('')).optional()
  })).optional(),
  faqs: Joi.array().items(Joi.object({
    _id: Joi.string().optional(),
    question: Joi.string().required(),
    answer: Joi.string().required()
  })).optional(),
  isActive: Joi.boolean().optional()
}).unknown(true).custom(validateCourseDateRange);
