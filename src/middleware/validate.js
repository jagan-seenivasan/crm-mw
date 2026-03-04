const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((error) => ({
      field: error.path || error.param || '',
      message: error.msg,
      location: error.location || '',
      value: error.value
    }));

    return next(
      new ApiError(422, 'Validation failed', {
        code: 'VALIDATION_ERROR',
        details
      })
    );
  }
  next();
}

module.exports = validate;
