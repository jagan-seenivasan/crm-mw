const BaseTenantRepository = require('./baseTenantRepository');
const { Task } = require('../models');

class TaskRepository extends BaseTenantRepository {
  constructor() {
    super(Task);
  }

  async list(tenantId, filter = {}) {
    return this.scopedFind(tenantId, filter)
      .populate({
        path: 'assignedTo',
        select: 'name email role',
        match: { tenantId },
        options: { tenantId }
      })
      .populate({
        path: 'leadId',
        select: 'title',
        match: { tenantId },
        options: { tenantId }
      })
      .sort({ createdAt: -1 });
  }

  async remove(tenantId, id) {
    return this.deleteById(tenantId, id);
  }
}

module.exports = new TaskRepository();
