const mongoose = require('mongoose');
const tenantScopePlugin = require('../plugins/tenantScopePlugin');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

auditLogSchema.plugin(tenantScopePlugin);
auditLogSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
