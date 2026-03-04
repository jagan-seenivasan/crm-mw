const { query } = require('express-validator');
const { AuditLog } = require('../models');

const listAuditLogsValidation = [
  query('action').optional({ values: 'falsy' }).isString().withMessage('action must be a string'),
  query('entity').optional({ values: 'falsy' }).isString().withMessage('entity must be a string'),
  query('entityId').optional({ values: 'falsy' }).isString().withMessage('entityId must be a string'),
  query('actorId').optional({ values: 'falsy' }).isMongoId().withMessage('actorId must be valid'),
  query('dateFrom').optional({ values: 'falsy' }).isISO8601().withMessage('dateFrom must be a valid date'),
  query('dateTo').optional({ values: 'falsy' }).isISO8601().withMessage('dateTo must be a valid date'),
  query('page').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('page must be >= 1'),
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200')
];

async function listAuditLogs(req, res, next) {
  try {
    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.entity) filter.entity = req.query.entity;
    if (req.query.entityId) filter.entityId = req.query.entityId;
    if (req.query.actorId) filter.actorId = req.query.actorId;
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
    }

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 25);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      AuditLog.findByTenant(req.tenantId, filter)
        .populate({
          path: 'actorId',
          select: 'name email role',
          match: { tenantId: req.tenantId },
          options: { tenantId: req.tenantId }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments({ tenantId: req.tenantId, ...filter }).setOptions({ tenantId: req.tenantId })
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listAuditLogsValidation,
  listAuditLogs
};
