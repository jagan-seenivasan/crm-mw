const ApiError = require('./apiError');

function assertTenantId(tenantId, context = 'tenant scoped operation') {
  if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
    throw new ApiError(400, `tenantId is required for ${context}`);
  }

  return tenantId.trim();
}

module.exports = assertTenantId;
