const Joi = require('joi');
const { ROLES } = require('../../config/constants');

exports.createUserSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid(...Object.values(ROLES)).required(),
  instituteId: Joi.string().optional(),
  branchId: Joi.string().optional(), // Must be valid ObjectId
  phone: Joi.string().allow('').optional(),
  permissions: Joi.array().items(Joi.string()).optional(),
  metadata: Joi.object().optional(),
  parentId: Joi.string().optional(),
  childrenIds: Joi.array().items(Joi.string()).optional(),
  rfid: Joi.string().allow('').optional(),
  qrId: Joi.string().allow('').optional(),
  faceId: Joi.string().allow('').optional()
});

exports.updateUserSchema = Joi.object({
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  phone: Joi.string().allow('').optional(),
  isActive: Joi.boolean().optional(),
  branchId: Joi.string().optional(),
  permissions: Joi.array().items(Joi.string()).optional(),
  profilePictureUrl: Joi.string().allow('').optional(),
  metadata: Joi.object().optional(),
  parentId: Joi.string().optional(),
  childrenIds: Joi.array().items(Joi.string()).optional(),
  rfid: Joi.string().allow('').optional(),
  qrId: Joi.string().allow('').optional(),
  faceId: Joi.string().allow('').optional()
}).options({ stripUnknown: true });

exports.linkParentStudentSchema = Joi.object({
  parentId: Joi.string().required(),
  studentId: Joi.string().required()
});

exports.setupParentSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().optional()
});
