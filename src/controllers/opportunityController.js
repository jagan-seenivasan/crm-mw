const { body, param, query } = require('express-validator');
const { opportunityRepository, opportunityStageHistoryRepository } = require('../repositories');
const { logAudit } = require('../services/auditService');
const ApiError = require('../utils/apiError');
const { toCsv } = require('../utils/csv');

const listOpportunityValidation = [
  query('stageId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('stageId must be valid'),
  query('accountId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('accountId must be valid'),
  query('status')
    .optional({ values: 'falsy' })
    .isIn(['OPEN', 'WON', 'LOST'])
    .withMessage('status must be OPEN, WON, or LOST'),
  query('q').optional({ values: 'falsy' }).isString().withMessage('q must be a string')
];

const createOpportunityValidation = [
  body('name').trim().notEmpty().withMessage('Opportunity name is required'),
  body('stageId').isMongoId().withMessage('stageId must be valid'),
  body('accountId').isMongoId().withMessage('accountId must be valid'),
  body('contactId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('contactId must be valid'),
  body('leadId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('leadId must be valid'),
  body('amount')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('amount must be a positive number')
];

const updateOpportunityValidation = [
  param('id').isMongoId().withMessage('Opportunity id must be valid'),
  body('stageId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('stageId must be valid'),
  body('accountId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('accountId must be valid'),
  body('contactId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('contactId must be valid')
];

const moveStageValidation = [
  param('id').isMongoId().withMessage('Opportunity id must be valid'),
  body('stageId').isMongoId().withMessage('stageId must be valid')
];

const deleteOpportunityValidation = [param('id').isMongoId().withMessage('Opportunity id must be valid')];
const stageHistoryValidation = [param('id').isMongoId().withMessage('Opportunity id must be valid')];

function hasStageChanged(beforeStageId, afterStageId) {
  if (!beforeStageId || !afterStageId) {
    return false;
  }
  return String(beforeStageId) !== String(afterStageId);
}

async function recordStageHistoryIfChanged(
  { tenantId, opportunityId, beforeStageId, afterStageId, actorId },
  deps = {}
) {
  const repo = deps.opportunityStageHistoryRepository || opportunityStageHistoryRepository;

  if (!hasStageChanged(beforeStageId, afterStageId)) {
    return false;
  }

  await repo.create(tenantId, {
    opportunityId,
    oldStage: beforeStageId,
    newStage: afterStageId,
    changedBy: actorId,
    changedAt: new Date()
  });

  return true;
}

async function listOpportunities(req, res, next) {
  try {
    const filter = {};
    if (req.query.stageId) {
      filter.stageId = req.query.stageId;
    }
    if (req.query.accountId) {
      filter.accountId = req.query.accountId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.q) {
      const regex = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { status: regex }];
    }
    const opportunities = await opportunityRepository.list(req.tenantId, filter);
    res.json(opportunities);
  } catch (error) {
    next(error);
  }
}

async function createOpportunity(req, res, next) {
  try {
    const opportunity = await opportunityRepository.create(req.tenantId, req.body);
    await logAudit({
      tenantId: req.tenantId,
      actorId: req.user._id,
      action: 'CREATE_OPPORTUNITY',
      entity: 'Opportunity',
      entityId: opportunity._id,
      metadata: { after: opportunity.toObject() }
    });
    res.status(201).json(opportunity);
  } catch (error) {
    next(error);
  }
}

async function updateOpportunity(req, res, next) {
  try {
    const before = await opportunityRepository.findById(req.tenantId, req.params.id);
    if (!before) throw new ApiError(404, 'Opportunity not found');

    const opportunity = await opportunityRepository.updateById(req.tenantId, req.params.id, req.body);
    await recordStageHistoryIfChanged({
      tenantId: req.tenantId,
      opportunityId: opportunity._id,
      beforeStageId: before.stageId,
      afterStageId: opportunity.stageId,
      actorId: req.user._id
    });

    await logAudit({
      tenantId: req.tenantId,
      actorId: req.user._id,
      action: 'UPDATE_OPPORTUNITY',
      entity: 'Opportunity',
      entityId: opportunity._id,
      metadata: { before: before.toObject(), after: opportunity.toObject() }
    });
    res.json(opportunity);
  } catch (error) {
    next(error);
  }
}

async function moveOpportunityStage(req, res, next) {
  try {
    const before = await opportunityRepository.findById(req.tenantId, req.params.id);
    if (!before) throw new ApiError(404, 'Opportunity not found');
    if (!hasStageChanged(before.stageId, req.body.stageId)) {
      return res.json(before);
    }

    const opportunity = await opportunityRepository.updateById(req.tenantId, req.params.id, {
      stageId: req.body.stageId
    });
    await recordStageHistoryIfChanged({
      tenantId: req.tenantId,
      opportunityId: opportunity._id,
      beforeStageId: before.stageId,
      afterStageId: opportunity.stageId,
      actorId: req.user._id
    });

    await logAudit({
      tenantId: req.tenantId,
      actorId: req.user._id,
      action: 'MOVE_OPPORTUNITY_STAGE',
      entity: 'Opportunity',
      entityId: opportunity._id,
      metadata: {
        beforeStageId: before.stageId,
        afterStageId: opportunity.stageId
      }
    });

    res.json(opportunity);
  } catch (error) {
    next(error);
  }
}

async function listStageHistory(req, res, next) {
  try {
    const opportunity = await opportunityRepository.findById(req.tenantId, req.params.id);
    if (!opportunity) throw new ApiError(404, 'Opportunity not found');

    const items = await opportunityStageHistoryRepository.listByOpportunity(req.tenantId, req.params.id);
    res.json(items);
  } catch (error) {
    next(error);
  }
}

async function deleteOpportunity(req, res, next) {
  try {
    const before = await opportunityRepository.findById(req.tenantId, req.params.id);
    if (!before) throw new ApiError(404, 'Opportunity not found');

    const deleted = await opportunityRepository.deleteById(req.tenantId, req.params.id);
    if (!deleted.deletedCount) throw new ApiError(404, 'Opportunity not found');

    await logAudit({
      tenantId: req.tenantId,
      actorId: req.user._id,
      action: 'DELETE_OPPORTUNITY',
      entity: 'Opportunity',
      entityId: req.params.id,
      metadata: { before: before.toObject() }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function exportOpportunities(req, res, next) {
  try {
    const filter = {};
    if (req.query.stageId) filter.stageId = req.query.stageId;
    if (req.query.accountId) filter.accountId = req.query.accountId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q) {
      const regex = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { status: regex }];
    }

    const opportunities = await opportunityRepository.list(req.tenantId, filter);
    const headers = ['id', 'name', 'status', 'amount', 'stage', 'account', 'contact', 'expectedCloseDate', 'createdAt'];
    const rows = opportunities.map((item) => [
      String(item._id),
      item.name || '',
      item.status || '',
      item.amount ?? 0,
      item.stageId?.name || item.stageId || '',
      item.accountId?.name || item.accountId || '',
      item.contactId?.email || item.contactId || '',
      item.expectedCloseDate ? new Date(item.expectedCloseDate).toISOString() : '',
      item.createdAt ? new Date(item.createdAt).toISOString() : ''
    ]);

    const csv = toCsv(headers, rows);
    const filename = `opportunities-${req.tenantId}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listOpportunityValidation,
  createOpportunityValidation,
  updateOpportunityValidation,
  moveStageValidation,
  deleteOpportunityValidation,
  stageHistoryValidation,
  listOpportunities,
  exportOpportunities,
  createOpportunity,
  updateOpportunity,
  moveOpportunityStage,
  listStageHistory,
  deleteOpportunity,
  __test: {
    hasStageChanged,
    recordStageHistoryIfChanged
  }
};
