const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const contactSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true, default: '' },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    title: { type: String, trim: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true }
  },
  { timestamps: true }
);

contactSchema.plugin(tenantPlugin);
contactSchema.index({ tenantId: 1, email: 1 }, { unique: true });
contactSchema.index({ tenantId: 1, accountId: 1, createdAt: -1 });

module.exports = mongoose.model('Contact', contactSchema);
