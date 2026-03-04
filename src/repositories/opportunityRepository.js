const BaseTenantRepository = require('./baseTenantRepository');
const { Opportunity } = require('../models');

class OpportunityRepository extends BaseTenantRepository {
  constructor() {
    super(Opportunity);
  }

  async list(tenantId, filter = {}) {
    return this.scopedFind(tenantId, filter)
      .populate({
        path: 'stageId',
        select: 'name order type',
        match: { tenantId, type: 'OPPORTUNITY' },
        options: { tenantId }
      })
      .populate({
        path: 'accountId',
        select: 'name',
        match: { tenantId },
        options: { tenantId }
      })
      .populate({
        path: 'contactId',
        select: 'firstName lastName email',
        match: { tenantId },
        options: { tenantId }
      })
      .sort({ createdAt: -1 });
  }
}

module.exports = new OpportunityRepository();
