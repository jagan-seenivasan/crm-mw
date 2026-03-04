const { body, param, query } = require('express-validator');
const { parse } = require('csv-parse/sync');
const { logAudit } = require('../services/auditService');
const { leadRepository } = require('../repositories');
const { convertLead } = require('../services/leadConversionService');
const { Stage, User } = require('../models');
const ApiError = require('../utils/apiError');
const { toCsv } = require('../utils/csv');

const createLeadValidation = [
  body('title').isString().notEmpty(),
  body('stageId').isMongoId(),
  body('ownerId').isMongoId()
];

const updateLeadValidation = [param('id').isMongoId()];
const listLeadValidation = [
  query('q').optional({ values: 'falsy' }).isString().withMessage('q must be a string'),
  query('stageId').optional({ values: 'falsy' }).isMongoId().withMessage('stageId must be valid'),
  query('ownerId').optional({ values: 'falsy' }).isMongoId().withMessage('ownerId must be valid'),
  query('isConverted').optional({ values: 'falsy' }).isIn(['true', 'false']).withMessage('isConverted must be true or false')
];

const convertLeadValidation = [
  param('id').isMongoId().withMessage('Lead id must be valid'),
  body('accountMode').isIn(['existing', 'create']).withMessage('accountMode must be existing or create'),
  body('existingAccountId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('existingAccountId must be valid'),
  body('contact.email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Contact email must be valid'),
  body('createOpportunity').optional().isBoolean().withMessage('createOpportunity must be boolean')
];

const importLeadValidation = [
  body('dryRun').optional().isIn(['true', 'false']).withMessage('dryRun must be true or false'),
  body('mapping').optional().isString().withMessage('mapping must be a JSON string'),
  body('defaults').optional().isString().withMessage('defaults must be a JSON string')
];

const MAX_IMPORT_ROWS = 2000;
const PREVIEW_LIMIT = 25;

async function listLeads(req, res, next) {
  try {
    const filter = {};
    if (req.query.stageId) filter.stageId = req.query.stageId;
    if (req.query.ownerId) filter.ownerId = req.query.ownerId;
    if (typeof req.query.isConverted === 'string') filter.isConverted = req.query.isConverted === 'true';
    if (req.query.q) {
      const regex = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: regex }, { email: regex }, { phone: regex }, { company: regex }];
    }

    const leads = await leadRepository.list(req.tenantId, filter);
    res.json(leads);
  } catch (error) {
    next(error);
  }
}

async function createLead(req, res, next) {
  try {
    const lead = await leadRepository.create(req.tenantId, req.body);
    await logAudit({
      tenantId: req.tenantId,
      actorId: req.user._id,
      action: 'CREATE_LEAD',
      entity: 'Lead',
      entityId: lead._id,
      metadata: { title: lead.title }
    });
    res.status(201).json(lead);
  } catch (error) {
    next(error);
  }
}

async function updateLead(req, res, next) {
  try {
    const lead = await leadRepository.updateById(req.tenantId, req.params.id, req.body);
    if (!lead) throw new ApiError(404, 'Lead not found');
    res.json(lead);
  } catch (error) {
    next(error);
  }
}

async function deleteLead(req, res, next) {
  try {
    const deleted = await leadRepository.deleteById(req.tenantId, req.params.id);
    if (!deleted.deletedCount) throw new ApiError(404, 'Lead not found');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function convertLeadHandler(req, res, next) {
  try {
    const conversion = await convertLead({
      tenantId: req.tenantId,
      leadId: req.params.id,
      payload: req.body,
      actorId: req.user._id
    });

    await logAudit({
      tenantId: req.tenantId,
      actorId: req.user._id,
      action: 'CONVERT_LEAD',
      entity: 'Lead',
      entityId: req.params.id,
      metadata: conversion
    });

    res.json(conversion);
  } catch (error) {
    next(error);
  }
}

function parseJsonField(value, fieldName) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${fieldName} must be an object`);
    }
    return parsed;
  } catch (_error) {
    throw new ApiError(400, `${fieldName} must be valid JSON`);
  }
}

function normalizeMappedPayload(row, mapping, defaults = {}) {
  const payload = {
    title: mapping.title ? String(row[mapping.title] || '').trim() : '',
    email: mapping.email ? String(row[mapping.email] || '').trim().toLowerCase() : '',
    phone: mapping.phone ? String(row[mapping.phone] || '').trim() : '',
    company: mapping.company ? String(row[mapping.company] || '').trim() : '',
    stageId: mapping.stageId ? String(row[mapping.stageId] || '').trim() : '',
    ownerId: mapping.ownerId ? String(row[mapping.ownerId] || '').trim() : '',
    value: mapping.value ? Number(String(row[mapping.value] || '').trim() || 0) : 0
  };

  if (!payload.stageId && defaults.stageId) payload.stageId = String(defaults.stageId);
  if (!payload.ownerId && defaults.ownerId) payload.ownerId = String(defaults.ownerId);
  return payload;
}

function validateImportPayload(payload) {
  const errors = [];
  if (!payload.title) errors.push('title is required');
  if (!payload.stageId) errors.push('stageId is required (mapping or default)');
  if (!payload.ownerId) errors.push('ownerId is required (mapping or default)');
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) errors.push('email is invalid');
  if (Number.isNaN(payload.value) || payload.value < 0) errors.push('value must be a non-negative number');
  return errors;
}

async function importLeads(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      throw new ApiError(400, 'CSV file is required as "file"');
    }

    const dryRun = String(req.body.dryRun || 'true') === 'true';
    const mapping = parseJsonField(req.body.mapping, 'mapping');
    const defaults = parseJsonField(req.body.defaults, 'defaults');

    const csvText = req.file.buffer.toString('utf8');
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
      max_record_size: 1024 * 64
    });

    if (!Array.isArray(records) || !records.length) {
      throw new ApiError(400, 'CSV file has no data rows');
    }
    if (records.length > MAX_IMPORT_ROWS) {
      throw new ApiError(400, `CSV row limit exceeded. Max ${MAX_IMPORT_ROWS} rows per import`);
    }

    const headers = Object.keys(records[0] || {});

    // Step 1: upload only, return headers/sample for mapping.
    if (!mapping || !Object.keys(mapping).length) {
      return res.json({
        dryRun: true,
        requiresMapping: true,
        headers,
        rowCount: records.length,
        sampleRows: records.slice(0, 10)
      });
    }

    const previewRows = [];
    const stageIds = new Set();
    const ownerIds = new Set();

    records.forEach((row, index) => {
      const payload = normalizeMappedPayload(row, mapping, defaults);
      const errors = validateImportPayload(payload);
      if (payload.stageId) stageIds.add(payload.stageId);
      if (payload.ownerId) ownerIds.add(payload.ownerId);
      previewRows.push({
        rowNumber: index + 2,
        payload,
        errors
      });
    });

    const existingStages = await Stage.find(
      { tenantId: req.tenantId, _id: { $in: Array.from(stageIds) } },
      { _id: 1 },
      { tenantId: req.tenantId }
    );
    const existingUsers = await User.find(
      { tenantId: req.tenantId, _id: { $in: Array.from(ownerIds) } },
      { _id: 1 },
      { tenantId: req.tenantId }
    );
    const stageSet = new Set(existingStages.map((item) => String(item._id)));
    const userSet = new Set(existingUsers.map((item) => String(item._id)));

    previewRows.forEach((row) => {
      if (row.payload.stageId && !stageSet.has(String(row.payload.stageId))) row.errors.push('stageId not found for tenant');
      if (row.payload.ownerId && !userSet.has(String(row.payload.ownerId))) row.errors.push('ownerId not found for tenant');
    });

    const validRows = previewRows.filter((row) => row.errors.length === 0);
    const invalidRows = previewRows.length - validRows.length;

    if (dryRun) {
      return res.json({
        dryRun: true,
        headers,
        summary: {
          totalRows: previewRows.length,
          validRows: validRows.length,
          invalidRows
        },
        previewRows: previewRows.slice(0, PREVIEW_LIMIT)
      });
    }

    const imported = [];
    const failed = [];

    for (const row of validRows) {
      try {
        const created = await leadRepository.create(req.tenantId, row.payload);
        imported.push({
          rowNumber: row.rowNumber,
          id: created._id,
          title: created.title
        });
      } catch (error) {
        failed.push({
          rowNumber: row.rowNumber,
          errors: [error.message]
        });
      }
    }

    if (imported.length) {
      await logAudit({
        tenantId: req.tenantId,
        actorId: req.user._id,
        action: 'IMPORT_LEADS',
        entity: 'Lead',
        entityId: req.user._id,
        metadata: {
          imported: imported.length,
          attempted: validRows.length,
          invalidRows
        }
      });
    }

    return res.json({
      dryRun: false,
      summary: {
        totalRows: previewRows.length,
        validRows: validRows.length,
        invalidRows,
        importedRows: imported.length,
        failedRows: failed.length
      },
      imported: imported.slice(0, PREVIEW_LIMIT),
      errors: [
        ...previewRows.filter((row) => row.errors.length).slice(0, PREVIEW_LIMIT),
        ...failed.slice(0, PREVIEW_LIMIT)
      ]
    });
  } catch (error) {
    next(error);
  }
}

async function exportLeads(req, res, next) {
  try {
    const filter = {};
    if (req.query.stageId) filter.stageId = req.query.stageId;
    if (req.query.ownerId) filter.ownerId = req.query.ownerId;
    if (typeof req.query.isConverted === 'string') filter.isConverted = req.query.isConverted === 'true';
    if (req.query.q) {
      const regex = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: regex }, { email: regex }, { phone: regex }, { company: regex }];
    }

    const leads = await leadRepository.list(req.tenantId, filter);
    const headers = ['id', 'title', 'email', 'phone', 'company', 'value', 'stage', 'owner', 'isConverted', 'createdAt'];
    const rows = leads.map((lead) => [
      String(lead._id),
      lead.title || '',
      lead.email || '',
      lead.phone || '',
      lead.company || '',
      lead.value ?? 0,
      lead.stageId?.name || lead.stageId || '',
      lead.ownerId?.name || lead.ownerId || '',
      lead.isConverted ? 'true' : 'false',
      lead.createdAt ? new Date(lead.createdAt).toISOString() : ''
    ]);

    const csv = toCsv(headers, rows);
    const filename = `leads-${req.tenantId}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createLeadValidation,
  updateLeadValidation,
  listLeadValidation,
  convertLeadValidation,
  importLeadValidation,
  listLeads,
  exportLeads,
  createLead,
  updateLead,
  deleteLead,
  convertLeadHandler,
  importLeads
};
