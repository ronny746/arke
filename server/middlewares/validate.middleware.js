const { errorResponse } = require('../common/responses');

module.exports = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false });
    
    if (error) {
      const details = error.details.map(i => i.message).join(', ');
      return errorResponse(res, 'Validation error', details, 422);
    }
    
    next();
  };
};
