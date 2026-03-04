const assertTenantId = require('../utils/assertTenantId');

const TENANT_SCOPED_QUERY_HOOKS = [
  'count',
  'countDocuments',
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany'
];

function getTenantIdFromQuery(query) {
  const options = query.getOptions ? query.getOptions() : {};
  const filter = query.getQuery ? query.getQuery() : {};

  const optionTenantId = options.tenantId;
  const filterTenantId = filter.tenantId;

  if (!optionTenantId && !filterTenantId) {
    throw new Error('tenantId must be provided through query options or filter');
  }

  if (optionTenantId && filterTenantId && optionTenantId !== filterTenantId) {
    throw new Error('tenantId mismatch between query options and filter');
  }

  return assertTenantId(optionTenantId || filterTenantId, `mongoose query: ${query.op}`);
}

function tenantScopePlugin(schema) {
  schema.add({
    tenantId: {
      type: String,
      required: true,
      index: true,
      trim: true
    }
  });

  schema.pre('save', function ensureTenantIdOnSave(next) {
    try {
      assertTenantId(this.tenantId, 'document save');
      next();
    } catch (error) {
      next(error);
    }
  });

  TENANT_SCOPED_QUERY_HOOKS.forEach((hook) => {
    schema.pre(hook, function enforceTenantScope(next) {
      try {
        const tenantId = getTenantIdFromQuery(this);
        this.where({ tenantId });
        next();
      } catch (error) {
        next(error);
      }
    });
  });

  schema.statics.findByTenant = function findByTenant(tenantId, filter = {}, projection, options = {}) {
    const safeTenantId = assertTenantId(tenantId, `${this.modelName}.findByTenant`);
    return this.find({ ...filter, tenantId: safeTenantId }, projection, { ...options, tenantId: safeTenantId });
  };

  schema.statics.findOneByTenant = function findOneByTenant(tenantId, filter = {}, projection, options = {}) {
    const safeTenantId = assertTenantId(tenantId, `${this.modelName}.findOneByTenant`);
    return this.findOne({ ...filter, tenantId: safeTenantId }, projection, { ...options, tenantId: safeTenantId });
  };

  schema.statics.updateOneByTenant = function updateOneByTenant(tenantId, filter = {}, update = {}, options = {}) {
    const safeTenantId = assertTenantId(tenantId, `${this.modelName}.updateOneByTenant`);
    return this.updateOne({ ...filter, tenantId: safeTenantId }, update, { ...options, tenantId: safeTenantId });
  };

  schema.statics.deleteOneByTenant = function deleteOneByTenant(tenantId, filter = {}, options = {}) {
    const safeTenantId = assertTenantId(tenantId, `${this.modelName}.deleteOneByTenant`);
    return this.deleteOne({ ...filter, tenantId: safeTenantId }, { ...options, tenantId: safeTenantId });
  };
}

module.exports = tenantScopePlugin;
