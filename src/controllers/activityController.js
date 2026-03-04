const { query } = require('express-validator');
const { Note, Task, Lead, Opportunity, Meeting, Call } = require('../models');

const ENTITY_TYPES = ['LEAD', 'ACCOUNT', 'CONTACT', 'OPPORTUNITY'];

const listActivityValidation = [
  query('entityType').isIn(ENTITY_TYPES).withMessage('entityType is invalid'),
  query('entityId').isMongoId().withMessage('entityId must be valid')
];

async function resolveLeadIds(tenantId, entityType, entityId) {
  if (entityType === 'LEAD') {
    return [entityId];
  }

  if (entityType === 'ACCOUNT') {
    const leads = await Lead.find({ tenantId, accountId: entityId }, { _id: 1 }, { tenantId });
    return leads.map((lead) => lead._id);
  }

  if (entityType === 'CONTACT') {
    const leads = await Lead.find({ tenantId, contactId: entityId }, { _id: 1 }, { tenantId });
    return leads.map((lead) => lead._id);
  }

  if (entityType === 'OPPORTUNITY') {
    const opportunity = await Opportunity.findOne({ tenantId, _id: entityId }, { leadId: 1 }, { tenantId });
    return opportunity?.leadId ? [opportunity.leadId] : [];
  }

  return [];
}

async function listActivity(req, res, next) {
  try {
    const { entityType, entityId } = req.query;
    const leadIds = await resolveLeadIds(req.tenantId, entityType, entityId);

    const notesPromise = Note.find({ tenantId: req.tenantId, entityType, entityId }, null, { tenantId: req.tenantId })
      .populate({ path: 'createdBy', select: 'name email', options: { tenantId: req.tenantId } })
      .sort({ createdAt: -1 });

    const tasksPromise = leadIds.length
      ? Task.find({ tenantId: req.tenantId, leadId: { $in: leadIds } }, null, { tenantId: req.tenantId })
          .populate({ path: 'assignedTo', select: 'name email', options: { tenantId: req.tenantId } })
          .sort({ createdAt: -1 })
      : Promise.resolve([]);

    const meetingModel = Meeting || null;
    const callModel = Call || null;

    const meetingsPromise = meetingModel
      ? meetingModel.find({ tenantId: req.tenantId, entityType, entityId }, null, { tenantId: req.tenantId }).sort({ createdAt: -1 })
      : Promise.resolve([]);

    const callsPromise = callModel
      ? callModel.find({ tenantId: req.tenantId, entityType, entityId }, null, { tenantId: req.tenantId }).sort({ createdAt: -1 })
      : Promise.resolve([]);

    const [notes, tasks, meetings, calls] = await Promise.all([notesPromise, tasksPromise, meetingsPromise, callsPromise]);

    const items = [
      ...notes.map((note) => ({
        itemType: 'NOTE',
        createdAt: note.createdAt,
        data: note
      })),
      ...tasks.map((task) => ({
        itemType: 'TASK',
        createdAt: task.createdAt,
        data: task
      })),
      ...meetings.map((meeting) => ({
        itemType: 'MEETING',
        createdAt: meeting.createdAt,
        data: meeting
      })),
      ...calls.map((call) => ({
        itemType: 'CALL',
        createdAt: call.createdAt,
        data: call
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      entityType,
      entityId,
      items
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listActivityValidation,
  listActivity
};
