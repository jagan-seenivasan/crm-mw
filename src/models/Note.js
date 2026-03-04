const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const ENTITY_TYPES = ['LEAD', 'ACCOUNT', 'CONTACT', 'OPPORTUNITY'];

const noteSchema = new mongoose.Schema(
  {
    entityType: { type: String, enum: ENTITY_TYPES, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    content: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

noteSchema.plugin(tenantPlugin);
noteSchema.index({ tenantId: 1, entityType: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
