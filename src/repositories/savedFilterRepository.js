const BaseTenantRepository = require('./baseTenantRepository');
const { SavedFilter } = require('../models');

class SavedFilterRepository extends BaseTenantRepository {
  constructor() {
    super(SavedFilter);
  }

  listByModule(tenantId, module, createdBy) {
    return this.scopedFind(tenantId, { module, createdBy }).sort({ createdAt: -1 });
  }
}

module.exports = new SavedFilterRepository();
