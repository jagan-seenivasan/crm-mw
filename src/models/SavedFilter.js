const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const savedFilterSchema = new mongoose.Schema(
  {
    module: { type: String, enum: ['LEADS', 'OPPORTUNITIES'], required: true },
    name: { type: String, required: true, trim: true },
    filters: { type: Object, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

savedFilterSchema.plugin(tenantPlugin);
savedFilterSchema.index({ tenantId: 1, module: 1, name: 1, createdBy: 1 }, { unique: true });
savedFilterSchema.index({ tenantId: 1, module: 1, createdAt: -1 });

module.exports = mongoose.model('SavedFilter', savedFilterSchema);
