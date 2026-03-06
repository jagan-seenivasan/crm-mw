const BaseTenantRepository = require('./baseTenantRepository');
const { OpportunityStageHistory } = require('../models');

class OpportunityStageHistoryRepository extends BaseTenantRepository {
  constructor() {
    super(OpportunityStageHistory);
  }

  async listByOpportunity(tenantId, opportunityId) {
    return this.scopedFind(tenantId, { opportunityId })
      .populate({
        path: 'oldStage',
        select: 'name type',
        match: { tenantId },
        options: { tenantId }
      })
      .populate({
        path: 'newStage',
        select: 'name type',
        match: { tenantId },
        options: { tenantId }
      })
      .populate({
        path: 'changedBy',
        select: 'name email role',
        match: { tenantId },
        options: { tenantId }
      })
      .sort({ changedAt: -1 });
  }
}

module.exports = new OpportunityStageHistoryRepository();
