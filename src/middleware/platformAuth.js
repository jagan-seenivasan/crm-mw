const ApiError = require('../utils/apiError');
const env = require('../config/env');

function platformAuth(req, _res, next) {
  if (!env.platformApiEnabled) {
    return next(new ApiError(403, 'Platform API is disabled'));
  }

  if (!env.platformApiSecret) {
    return next(new ApiError(500, 'Platform API secret is not configured'));
  }

  const provided = req.header('x-platform-secret');
  if (!provided || provided !== env.platformApiSecret) {
    return next(new ApiError(401, 'Invalid platform secret'));
  }

  next();
}

module.exports = platformAuth;
