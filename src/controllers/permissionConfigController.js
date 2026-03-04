const { body } = require('express-validator');
const { ROLES, DEFAULT_PERMISSION_MATRIX } = require('../utils/permissions');
const { getOrCreatePermissionConfig, normalizePermissions } = require('../services/permissionConfigService');

const updatePermissionConfigValidation = [body('permissions').isObject().withMessage('permissions must be an object')];

function toEntries(matrix) {
  return Object.keys(DEFAULT_PERMISSION_MATRIX)
    .sort()
    .map((key) => {
      const [module, ...rest] = key.split('_');
      const action = rest.length ? rest.join('_') : 'ACCESS';
      return {
        key,
        module,
        action,
        roles: matrix[key] || []
      };
    });
}

async function getPermissionConfig(req, res, next) {
  try {
    const config = await getOrCreatePermissionConfig(req.tenantId);
    const permissions = normalizePermissions(config.permissions || {});
    res.json({
      roles: Object.values(ROLES),
      permissions,
      entries: toEntries(permissions)
    });
  } catch (error) {
    next(error);
  }
}

async function updatePermissionConfig(req, res, next) {
  try {
    const config = await getOrCreatePermissionConfig(req.tenantId);
    const permissions = normalizePermissions(req.body.permissions || {});
    config.permissions = permissions;
    await config.save();
    res.json({
      roles: Object.values(ROLES),
      permissions,
      entries: toEntries(permissions)
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  updatePermissionConfigValidation,
  getPermissionConfig,
  updatePermissionConfig
};
