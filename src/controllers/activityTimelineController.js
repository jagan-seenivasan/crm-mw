const { query } = require('express-validator');
const { Note, Task, AuditLog, Lead, Opportunity, Stage } = require('../models');

const ENTITY_TYPES = ['LEAD', 'ACCOUNT', 'CONTACT', 'OPPORTUNITY'];

function normalizeEntityType(value) {
  return String(value || '').trim().toUpperCase();
}

function formatUser(user) {
  if (!user) {
    return null;
  }
  if (typeof user === 'string') {
    return { id: user, name: 'User' };
  }
  return {
    id: user._id ? String(user._id) : String(user.id || ''),
    name: user.name || 'User',
    email: user.email || ''
  };
}

function asObjectIdStrings(values) {
  return Array.from(new Set((values || []).filter(Boolean).map((value) => String(value))));
}

function getStageChangeFromAudit(audit) {
  const beforeStageId = audit?.metadata?.beforeStageId || audit?.metadata?.before?.stageId || null;
  const afterStageId = audit?.metadata?.afterStageId || audit?.metadata?.after?.stageId || null;
  if (!beforeStageId && !afterStageId) {
    return null;
  }
  if (beforeStageId && afterStageId && String(beforeStageId) === String(afterStageId)) {
    return null;
  }
  return {
    beforeStageId: beforeStageId ? String(beforeStageId) : null,
    afterStageId: afterStageId ? String(afterStageId) : null
  };
}

function toTimelineSort(a, b) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

const getActivityTimelineValidation = [
  query('entityType')
    .isString()
    .custom((value) => ENTITY_TYPES.includes(normalizeEntityType(value)))
    .withMessage(`entityType must be one of: ${ENTITY_TYPES.join(', ')}`),
  query('entityId').isMongoId().withMessage('entityId must be valid'),
  query('page').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('page must be >= 1'),
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
];

async function resolveEntityContext(tenantId, entityType, entityId) {
  const leadIds = [];
  const opportunityIds = [];

  if (entityType === 'LEAD') {
    leadIds.push(entityId);
    const lead = await Lead.findOne({ tenantId, _id: entityId }, { opportunityId: 1 }, { tenantId });
    if (lead?.opportunityId) {
      opportunityIds.push(String(lead.opportunityId));
    }
    const opportunities = await Opportunity.find({ tenantId, leadId: entityId }, { _id: 1 }, { tenantId });
    opportunities.forEach((opportunity) => opportunityIds.push(String(opportunity._id)));
  }

  if (entityType === 'ACCOUNT') {
    const leads = await Lead.find({ tenantId, accountId: entityId }, { _id: 1 }, { tenantId });
    const opportunities = await Opportunity.find({ tenantId, accountId: entityId }, { _id: 1 }, { tenantId });
    leads.forEach((lead) => leadIds.push(String(lead._id)));
    opportunities.forEach((opportunity) => opportunityIds.push(String(opportunity._id)));
  }

  if (entityType === 'CONTACT') {
    const leads = await Lead.find({ tenantId, contactId: entityId }, { _id: 1 }, { tenantId });
    const opportunities = await Opportunity.find({ tenantId, contactId: entityId }, { _id: 1 }, { tenantId });
    leads.forEach((lead) => leadIds.push(String(lead._id)));
    opportunities.forEach((opportunity) => opportunityIds.push(String(opportunity._id)));
  }

  if (entityType === 'OPPORTUNITY') {
    opportunityIds.push(entityId);
    const opportunity = await Opportunity.findOne({ tenantId, _id: entityId }, { leadId: 1 }, { tenantId });
    if (opportunity?.leadId) {
      leadIds.push(String(opportunity.leadId));
    }
  }

  return {
    leadIds: asObjectIdStrings(leadIds),
    opportunityIds: asObjectIdStrings(opportunityIds)
  };
}

function buildAuditCriteria(entityType, entityId, leadIds, opportunityIds) {
  const entityName = entityType.charAt(0) + entityType.slice(1).toLowerCase();
  const criteria = [{ entity: entityName, entityId: String(entityId) }];

  if (leadIds.length) {
    criteria.push({ entity: 'Lead', entityId: { $in: leadIds } });
  }
  if (opportunityIds.length) {
    criteria.push({ entity: 'Opportunity', entityId: { $in: opportunityIds } });
  }

  return criteria;
}

async function getActivityTimeline(req, res, next) {
  try {
    const entityType = normalizeEntityType(req.query.entityType);
    const entityId = String(req.query.entityId);
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const tenantId = req.tenantId;

    const { leadIds, opportunityIds } = await resolveEntityContext(tenantId, entityType, entityId);
    const auditCriteria = buildAuditCriteria(entityType, entityId, leadIds, opportunityIds);

    const [notes, tasks, auditLogs, convertedLeads] = await Promise.all([
      Note.find({ tenantId, entityType, entityId }, null, { tenantId })
        .populate({ path: 'createdBy', select: 'name email', options: { tenantId } })
        .sort({ createdAt: -1 })
        .limit(300),
      leadIds.length
        ? Task.find({ tenantId, leadId: { $in: leadIds } }, null, { tenantId })
            .populate({ path: 'assignedTo', select: 'name email', options: { tenantId } })
            .sort({ createdAt: -1 })
            .limit(300)
        : Promise.resolve([]),
      AuditLog.find({ tenantId, $or: auditCriteria }, null, { tenantId })
        .populate({ path: 'actorId', select: 'name email', options: { tenantId } })
        .sort({ createdAt: -1 })
        .limit(500),
      leadIds.length
        ? Lead.find({ tenantId, _id: { $in: leadIds }, isConverted: true, convertedAt: { $ne: null } }, null, { tenantId })
            .populate({ path: 'ownerId', select: 'name email', options: { tenantId } })
            .sort({ convertedAt: -1 })
        : Promise.resolve([])
    ]);

    const stageChanges = auditLogs
      .filter((audit) => audit.action === 'MOVE_OPPORTUNITY_STAGE' || audit.action === 'UPDATE_OPPORTUNITY')
      .map((audit) => ({
        audit,
        stage: getStageChangeFromAudit(audit)
      }))
      .filter((entry) => !!entry.stage);

    const stageIds = asObjectIdStrings(
      stageChanges.flatMap((entry) => [entry.stage.beforeStageId, entry.stage.afterStageId]).filter(Boolean)
    );
    const stageMap = new Map();
    if (stageIds.length) {
      const stages = await Stage.find({ tenantId, _id: { $in: stageIds } }, { _id: 1, name: 1 }, { tenantId });
      stages.forEach((stage) => stageMap.set(String(stage._id), stage.name));
    }

    const conversionAuditLeadIds = new Set(
      auditLogs.filter((audit) => audit.action === 'CONVERT_LEAD').map((audit) => String(audit.entityId))
    );

    const timelineItems = [
      ...notes.map((note) => ({
        type: 'NOTE',
        title: 'Note added',
        description: note.content,
        createdAt: note.createdAt,
        createdBy: formatUser(note.createdBy),
        metadata: {
          noteId: String(note._id),
          entityType: note.entityType,
          entityId: String(note.entityId)
        }
      })),
      ...tasks.map((task) => ({
        type: 'TASK',
        title: task.title,
        description: `Task ${task.status}${task.dueDate ? ` | Due ${new Date(task.dueDate).toISOString().slice(0, 10)}` : ''}`,
        createdAt: task.createdAt,
        createdBy: formatUser(task.assignedTo),
        metadata: {
          taskId: String(task._id),
          status: task.status,
          assignedTo: formatUser(task.assignedTo),
          leadId: task.leadId ? String(task.leadId) : null
        }
      })),
      ...auditLogs.map((audit) => ({
        type: 'AUDIT_LOG_CHANGE',
        title: audit.action.replace(/_/g, ' '),
        description: `${audit.entity} updated`,
        createdAt: audit.createdAt,
        createdBy: formatUser(audit.actorId),
        metadata: {
          action: audit.action,
          entity: audit.entity,
          entityId: audit.entityId,
          ...audit.metadata
        }
      })),
      ...stageChanges.map((entry) => ({
        type: 'OPPORTUNITY_STAGE_CHANGE',
        title: 'Opportunity stage changed',
        description: `${stageMap.get(entry.stage.beforeStageId) || 'Unassigned'} -> ${stageMap.get(entry.stage.afterStageId) || 'Unassigned'}`,
        createdAt: entry.audit.createdAt,
        createdBy: formatUser(entry.audit.actorId),
        metadata: {
          opportunityId: String(entry.audit.entityId),
          beforeStageId: entry.stage.beforeStageId,
          afterStageId: entry.stage.afterStageId,
          beforeStageName: stageMap.get(entry.stage.beforeStageId) || null,
          afterStageName: stageMap.get(entry.stage.afterStageId) || null
        }
      })),
      ...auditLogs
        .filter((audit) => audit.action === 'CONVERT_LEAD')
        .map((audit) => ({
          type: 'LEAD_CONVERSION',
          title: 'Lead converted',
          description: 'Lead converted to account/contact/opportunity',
          createdAt: audit.createdAt,
          createdBy: formatUser(audit.actorId),
          metadata: {
            leadId: String(audit.entityId),
            ...audit.metadata
          }
        })),
      ...convertedLeads
        .filter((lead) => !conversionAuditLeadIds.has(String(lead._id)))
        .map((lead) => ({
          type: 'LEAD_CONVERSION',
          title: 'Lead converted',
          description: `${lead.title || 'Lead'} converted`,
          createdAt: lead.convertedAt,
          createdBy: formatUser(lead.ownerId),
          metadata: {
            leadId: String(lead._id),
            accountId: lead.accountId ? String(lead.accountId) : null,
            contactId: lead.contactId ? String(lead.contactId) : null,
            opportunityId: lead.opportunityId ? String(lead.opportunityId) : null
          }
        }))
    ].sort(toTimelineSort);

    const startIndex = (page - 1) * limit;
    const items = timelineItems.slice(startIndex, startIndex + limit);

    res.json({
      entityType,
      entityId,
      page,
      limit,
      total: timelineItems.length,
      hasMore: startIndex + limit < timelineItems.length,
      items
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getActivityTimelineValidation,
  getActivityTimeline,
  __test: {
    normalizeEntityType,
    getStageChangeFromAudit,
    toTimelineSort
  }
};
