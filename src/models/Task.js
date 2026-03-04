const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    dueDate: { type: Date },
    status: { type: String, enum: ['TODO', 'IN_PROGRESS', 'DONE'], default: 'TODO' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null }
  },
  { timestamps: true }
);

taskSchema.plugin(tenantPlugin);
taskSchema.index({ tenantId: 1, assignedTo: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
