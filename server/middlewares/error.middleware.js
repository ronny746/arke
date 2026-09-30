const { errorResponse } = require('../common/responses');

module.exports = (err, req, res, next) => {
  console.error(err.stack);
  const isDuplicateKey = err && err.code === 11000;
  const statusCode = err.statusCode || (isDuplicateKey ? 409 : 500);
  const message = isDuplicateKey
    ? 'A record with these details already exists. Please use a different value or edit the existing record.'
    : (err.message || 'Internal Server Error');
  return errorResponse(res, message, err, statusCode);
};
