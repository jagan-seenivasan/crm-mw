const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const opportunityStageHistorySchema = new mongoose.Schema(
  {
    opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true, index: true },
    oldStage: { type: mongoose.Schema.Types.ObjectId, ref: 'Stage', required: true },
    newStage: { type: mongoose.Schema.Types.ObjectId, ref: 'Stage', required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now, required: true }
  },
  { timestamps: false }
);

opportunityStageHistorySchema.plugin(tenantPlugin);
opportunityStageHistorySchema.index({ tenantId: 1, opportunityId: 1, changedAt: -1 });

module.exports = mongoose.model('OpportunityStageHistory', opportunityStageHistorySchema);
