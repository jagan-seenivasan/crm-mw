const assertTenantId = require('../utils/assertTenantId');

class BaseTenantRepository {
  constructor(model) {
    this.model = model;
  }

  ensureNoTenantOverride(payload, tenantId, context) {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'tenantId') && payload.tenantId !== tenantId) {
      throw new Error(`tenantId cannot be overridden in ${context}`);
    }
  }

  scopedFind(tenantId, filter = {}, projection, options = {}) {
    const safeTenantId = assertTenantId(tenantId, `${this.model.modelName}.scopedFind`);
    return this.model.find(filter, projection, { ...options, tenantId: safeTenantId });
  }

  scopedFindOne(tenantId, filter = {}, projection, options = {}) {
    const safeTenantId = assertTenantId(tenantId, `${this.model.modelName}.scopedFindOne`);
    return this.model.findOne(filter, projection, { ...options, tenantId: safeTenantId });
  }

  async create(tenantId, payload = {}) {
    const safeTenantId = assertTenantId(tenantId, `${this.model.modelName}.create`);
    this.ensureNoTenantOverride(payload, safeTenantId, `${this.model.modelName}.create`);
    return this.model.create({ ...payload, tenantId: safeTenantId });
  }

  async findById(tenantId, id) {
    const safeTenantId = assertTenantId(tenantId, `${this.model.modelName}.findById`);
    return this.model.findOne({ _id: id }, null, { tenantId: safeTenantId });
  }

  async updateById(tenantId, id, payload = {}) {
    const safeTenantId = assertTenantId(tenantId, `${this.model.modelName}.updateById`);
    this.ensureNoTenantOverride(payload, safeTenantId, `${this.model.modelName}.updateById`);
    return this.model.findOneAndUpdate({ _id: id }, payload, { new: true, tenantId: safeTenantId });
  }

  async deleteById(tenantId, id) {
    const safeTenantId = assertTenantId(tenantId, `${this.model.modelName}.deleteById`);
    return this.model.deleteOne({ _id: id }, { tenantId: safeTenantId });
  }

  async count(tenantId, filter = {}) {
    const safeTenantId = assertTenantId(tenantId, `${this.model.modelName}.count`);
    return this.model.countDocuments(filter).setOptions({ tenantId: safeTenantId });
  }
}

module.exports = BaseTenantRepository;
