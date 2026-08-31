const Joi = require('joi');

exports.markAttendanceSchema = Joi.object({
  classId: Joi.string().required(),
  subjectId: Joi.string().optional(),
  date: Joi.date().iso().required(),
  records: Joi.array().items(
    Joi.object({
      studentId: Joi.string().required(),
      status: Joi.string().valid('present', 'absent', 'late', 'leave').required(),
      remarks: Joi.string().optional(),
      geoCheckIn: Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
        timestamp: Joi.date().iso().required()
      }).optional()
    })
  ).required()
});

exports.getAttendanceSchema = Joi.object({
  classId: Joi.string().optional(),
  subjectId: Joi.string().optional(),
  studentId: Joi.string().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional()
});

exports.geoCheckinSchema = Joi.object({
  classId: Joi.string().required(),
  latitude: Joi.number().required(),
  longitude: Joi.number().required()
});
