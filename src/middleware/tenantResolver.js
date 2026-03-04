const ApiError = require('../utils/apiError');

function tenantResolver(req, _res, next) {
  if (req.path === '/health' || req.path.startsWith('/api/docs') || req.path.startsWith('/api/platform')) {
    return next();
  }

  const tenantId = req.header('x-tenant-id');
  if (!tenantId) {
    return next(new ApiError(400, 'x-tenant-id header is required'));
  }

  req.tenantId = tenantId;
  next();
}

module.exports = tenantResolver;
