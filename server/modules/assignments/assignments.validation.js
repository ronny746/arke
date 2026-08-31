const Joi = require('joi');

exports.createAssignmentSchema = Joi.object({
  classId: Joi.string().required(),
  subjectId: Joi.string().optional(),
  title: Joi.string().required(),
  description: Joi.string().optional(),
  attachments: Joi.array().items(Joi.string()).optional(),
  dueDate: Joi.date().iso().required(),
  maxMarks: Joi.number().optional()
});

exports.submitAssignmentSchema = Joi.object({
  content: Joi.string().optional(),
  attachments: Joi.array().items(Joi.string()).optional()
});

exports.gradeAssignmentSchema = Joi.object({
  marksObtained: Joi.number().required(),
  teacherComments: Joi.string().optional()
});
