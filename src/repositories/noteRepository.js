const BaseTenantRepository = require('./baseTenantRepository');
const { Note } = require('../models');

class NoteRepository extends BaseTenantRepository {
  constructor() {
    super(Note);
  }

  async listByEntity(tenantId, entityType, entityId) {
    return this.scopedFind(tenantId, { entityType, entityId })
      .populate({ path: 'createdBy', select: 'name email', options: { tenantId } })
      .sort({ createdAt: -1 });
  }
}

module.exports = new NoteRepository();
