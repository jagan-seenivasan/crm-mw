const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const stageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
    type: {
      type: String,
      enum: ['LEAD', 'OPPORTUNITY'],
      default: 'LEAD',
      required: true
    }
  },
  { timestamps: true }
);

stageSchema.plugin(tenantPlugin);
stageSchema.index({ tenantId: 1, type: 1, order: 1 }, { unique: true });
stageSchema.index({ tenantId: 1, type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Stage', stageSchema);
