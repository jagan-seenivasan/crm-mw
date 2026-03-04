const BaseTenantRepository = require('./baseTenantRepository');
const { Account } = require('../models');

class AccountRepository extends BaseTenantRepository {
  constructor() {
    super(Account);
  }

  async list(tenantId) {
    return this.scopedFind(tenantId).sort({ createdAt: -1 });
  }
}

module.exports = new AccountRepository();
