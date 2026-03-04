const ApiError = require('../utils/apiError');
const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');

async function auth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      throw new ApiError(401, 'Authorization token is required');
    }

    const payload = verifyAccessToken(token);
    if (!req.tenantId || payload.tenantId !== req.tenantId) {
      throw new ApiError(403, 'Tenant context mismatch');
    }

    const user = await User.findOneByTenant(req.tenantId, { _id: payload.sub, isActive: true });
    if (!user) {
      throw new ApiError(401, 'User not found or inactive');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Access token expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid token'));
    }
    next(error);
  }
}

module.exports = auth;
