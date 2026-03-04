const ApiError = require('../utils/apiError');
const { getAllowedRolesForPermission } = require('../services/permissionConfigService');

function requirePermission(permissionKey) {
  return async (req, _res, next) => {
    try {
      const allowedRoles = await getAllowedRolesForPermission(req.tenantId, permissionKey);
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return next(new ApiError(403, 'Forbidden'));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = requirePermission;
