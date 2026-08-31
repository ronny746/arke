const Joi = require('joi');
const { ROLES } = require('../../config/constants');

exports.loginSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
  role: Joi.string().valid(...Object.values(ROLES)).optional().description('Specify the role/portal the user is attempting to log into')
});
