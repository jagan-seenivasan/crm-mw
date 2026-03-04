const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    industry: { type: String, trim: true },
    billingAddress: { type: String, trim: true },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

accountSchema.plugin(tenantPlugin);
accountSchema.index({ tenantId: 1, name: 1 }, { unique: true });
accountSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('Account', accountSchema);
