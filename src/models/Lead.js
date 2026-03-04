const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const leadSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    value: { type: Number, default: 0 },
    stageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stage', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, default: '' },
    isConverted: { type: Boolean, default: false },
    convertedAt: { type: Date, default: null },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', default: null }
  },
  { timestamps: true }
);

leadSchema.plugin(tenantPlugin);
leadSchema.index({ tenantId: 1, stageId: 1 });
leadSchema.index({ tenantId: 1, ownerId: 1 });

module.exports = mongoose.model('Lead', leadSchema);
