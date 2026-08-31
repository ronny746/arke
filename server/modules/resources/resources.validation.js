const Joi = require('joi');

exports.createResourceSchema = Joi.object({
  batchId: Joi.string().when('type', {
    is: 'FOLDER',
    then: Joi.optional().allow('', null),
    otherwise: Joi.required()
  }),
  subjectId: Joi.string().allow('', null).optional(),
  title: Joi.string().required(),
  description: Joi.string().allow('', null).optional(),
  type: Joi.string().valid('NOTES', 'PAST_PAPER', 'VIDEO', 'SYLLABUS', 'FOLDER').required(),
  fileUrl: Joi.string().uri().when('type', {
    is: 'FOLDER',
    then: Joi.optional().allow('', null),
    otherwise: Joi.required()
  }),
  folderPath: Joi.string().allow('', null).optional()
});
