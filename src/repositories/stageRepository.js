const BaseTenantRepository = require('./baseTenantRepository');
const { Stage } = require('../models');

class StageRepository extends BaseTenantRepository {
  constructor() {
    super(Stage);
  }

  async list(tenantId, type) {
    const filter = {};
    if (type) {
      filter.type = type;
    }
    return this.scopedFind(tenantId, filter).sort({ order: 1 });
  }
}

module.exports = new StageRepository();
