const BaseTenantRepository = require('./baseTenantRepository');
const { Lead } = require('../models');

class LeadRepository extends BaseTenantRepository {
  constructor() {
    super(Lead);
  }

  async list(tenantId, filter = {}) {
    return this.scopedFind(tenantId, filter)
      .populate({
        path: 'stageId',
        select: 'name order',
        match: { tenantId },
        options: { tenantId }
      })
      .populate({
        path: 'ownerId',
        select: 'name email role',
        match: { tenantId },
        options: { tenantId }
      })
      .sort({ createdAt: -1 });
  }
}

module.exports = new LeadRepository();
