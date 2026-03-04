const { body } = require('express-validator');
const { Tenant, User, Stage } = require('../models');
const ApiError = require('../utils/apiError');

const createPlatformTenantValidation = [
  body('tenantName').trim().notEmpty().withMessage('tenantName is required'),
  body('tenantCode')
    .trim()
    .notEmpty()
    .withMessage('tenantCode is required')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('tenantCode must contain only lowercase letters, numbers, and hyphens'),
  body('ownerName').trim().notEmpty().withMessage('ownerName is required'),
  body('ownerEmail').isEmail().withMessage('ownerEmail must be valid'),
  body('ownerPassword').isLength({ min: 6 }).withMessage('ownerPassword must be at least 6 characters')
];

const DEFAULT_LEAD_STAGES = [
  { name: 'New', order: 1 },
  { name: 'Contacted', order: 2 },
  { name: 'Qualified', order: 3 },
  { name: 'Proposal', order: 4 },
  { name: 'Won', order: 5 }
];

const DEFAULT_OPPORTUNITY_STAGES = [
  { name: 'Prospecting', order: 1 },
  { name: 'Discovery', order: 2 },
  { name: 'Proposal', order: 3 },
  { name: 'Negotiation', order: 4 },
  { name: 'Closed Won', order: 5 }
];

async function createPlatformTenant(req, res, next) {
  let createdTenant = null;
  try {
    const tenantCode = String(req.body.tenantCode || '').trim().toLowerCase();
    const tenantName = String(req.body.tenantName || '').trim();
    const ownerEmail = String(req.body.ownerEmail || '').trim().toLowerCase();

    const existingTenant = await Tenant.findOne({ code: tenantCode });
    if (existingTenant) {
      throw new ApiError(409, 'Tenant code already exists');
    }

    const ownerExists = await User.findOne({ tenantId: tenantCode, email: ownerEmail });
    if (ownerExists) {
      throw new ApiError(409, 'Owner email already exists for tenant');
    }

    createdTenant = await Tenant.create({
      name: tenantName,
      code: tenantCode,
      isActive: true
    });

    const owner = await User.create({
      tenantId: tenantCode,
      name: req.body.ownerName,
      email: ownerEmail,
      password: req.body.ownerPassword,
      role: 'OWNER',
      isActive: true
    });

    for (const stage of DEFAULT_LEAD_STAGES) {
      await Stage.findOneAndUpdate(
        { tenantId: tenantCode, type: 'LEAD', name: stage.name },
        { tenantId: tenantCode, type: 'LEAD', ...stage },
        { upsert: true, new: true }
      );
    }

    for (const stage of DEFAULT_OPPORTUNITY_STAGES) {
      await Stage.findOneAndUpdate(
        { tenantId: tenantCode, type: 'OPPORTUNITY', name: stage.name },
        { tenantId: tenantCode, type: 'OPPORTUNITY', ...stage },
        { upsert: true, new: true }
      );
    }

    res.status(201).json({
      message: 'Tenant provisioned successfully',
      tenant: {
        id: createdTenant._id,
        code: createdTenant.code,
        name: createdTenant.name
      },
      owner: {
        id: owner._id,
        email: owner.email,
        role: owner.role
      },
      seededStages: {
        lead: DEFAULT_LEAD_STAGES.length,
        opportunity: DEFAULT_OPPORTUNITY_STAGES.length
      }
    });
  } catch (error) {
    if (createdTenant) {
      await Tenant.deleteOne({ _id: createdTenant._id }).catch(() => {});
      await User.deleteMany({ tenantId: createdTenant.code }).catch(() => {});
      await Stage.deleteMany({ tenantId: createdTenant.code }).catch(() => {});
    }
    next(error);
  }
}

module.exports = {
  createPlatformTenantValidation,
  createPlatformTenant
};
