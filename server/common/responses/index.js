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
    message: message || 'An error occurred',
    error: typeof error === 'string' ? error : (error?.message || error || message)
  };

  if (error && typeof error === 'object' && error.details) {
    response.details = error.details;
  }

  return res.status(statusCode).json(response);
};
