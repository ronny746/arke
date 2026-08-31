exports.successResponse = (res, message, data = null, meta = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta
  });
};

exports.errorResponse = (res, message, error = null, statusCode = 500) => {
  const response = {
    success: false,
    message
  };

  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error;
  }

  return res.status(statusCode).json(response);
};
