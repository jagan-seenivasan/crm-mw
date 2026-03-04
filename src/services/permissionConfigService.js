const { PermissionConfig } = require('../models');
const { DEFAULT_PERMISSION_MATRIX, ROLES } = require('../utils/permissions');

function normalizePermissions(input = {}) {
  const roleValues = Object.values(ROLES);
  const matrix = {};

  for (const [key, defaultRoles] of Object.entries(DEFAULT_PERMISSION_MATRIX)) {
    const configured = Array.isArray(input[key]) ? input[key] : defaultRoles;
    matrix[key] = configured.filter((role) => roleValues.includes(role));
  }

  return matrix;
}

async function getOrCreatePermissionConfig(tenantId) {
  let config = await PermissionConfig.findOne({ tenantId }, null, { tenantId });
  if (!config) {
    config = await PermissionConfig.create({
      tenantId,
      permissions: DEFAULT_PERMISSION_MATRIX
    });
    return config;
  }

  const normalized = normalizePermissions(config.permissions || {});
  const changed = JSON.stringify(normalized) !== JSON.stringify(config.permissions || {});
  if (changed) {
    config.permissions = normalized;
    await config.save();
  }

  return config;
}

async function getAllowedRolesForPermission(tenantId, permissionKey) {
  const config = await getOrCreatePermissionConfig(tenantId);
  const matrix = normalizePermissions(config.permissions || {});
  return matrix[permissionKey] || [];
}

module.exports = {
  normalizePermissions,
  getOrCreatePermissionConfig,
  getAllowedRolesForPermission
};
