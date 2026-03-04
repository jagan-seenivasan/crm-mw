const BaseTenantRepository = require('./baseTenantRepository');
const { Contact } = require('../models');

class ContactRepository extends BaseTenantRepository {
  constructor() {
    super(Contact);
  }

  async list(tenantId, filter = {}) {
    return this.scopedFind(tenantId, filter)
      .populate({
        path: 'accountId',
        select: 'name',
        match: { tenantId },
        options: { tenantId }
      })
      .sort({ createdAt: -1 });
  }
}

module.exports = new ContactRepository();
