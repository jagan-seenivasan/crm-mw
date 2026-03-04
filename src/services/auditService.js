const { AuditLog } = require('../models');

async function logAudit({ tenantId, actorId, action, entity, entityId, metadata = {} }) {
  await AuditLog.create({ tenantId, actorId, action, entity, entityId: String(entityId), metadata });
}

module.exports = { logAudit };
