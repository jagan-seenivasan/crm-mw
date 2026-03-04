function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || (status === 422 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR');

  res.status(status).json({
    message,
    error: {
      code,
      details: Array.isArray(err.details) ? err.details : []
    }
  });
}

module.exports = errorHandler;
