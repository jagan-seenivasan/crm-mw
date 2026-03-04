const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const permissionConfigSchema = new mongoose.Schema(
  {
    permissions: { type: Object, default: {} }
  },
  { timestamps: true }
);

permissionConfigSchema.plugin(tenantPlugin);

module.exports = mongoose.model('PermissionConfig', permissionConfigSchema);
