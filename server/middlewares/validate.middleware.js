const { errorResponse } = require('../common/responses');

module.exports = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { 
      abortEarly: false, 
      allowUnknown: true, 
      stripUnknown: true 
    });
    
    if (error) {
      const details = error.details.map(i => i.message.replace(/['"]/g, '')).join(', ');
      return errorResponse(res, `Validation Error: ${details}`, details, 422);
    }
    
    req[property] = value;
    next();
  };
};
