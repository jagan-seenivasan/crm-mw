const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const opportunitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['OPEN', 'WON', 'LOST'],
      default: 'OPEN'
    },
    stageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stage', required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    expectedCloseDate: { type: Date, default: null }
  },
  { timestamps: true }
);

opportunitySchema.plugin(tenantPlugin);
opportunitySchema.index({ tenantId: 1, accountId: 1, createdAt: -1 });
opportunitySchema.index({ tenantId: 1, stageId: 1, createdAt: -1 });
opportunitySchema.index(
  { tenantId: 1, leadId: 1 },
  { unique: true, partialFilterExpression: { leadId: { $exists: true, $ne: null } } }
);

module.exports = mongoose.model('Opportunity', opportunitySchema);
