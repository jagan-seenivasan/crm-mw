const { Tenant } = require('../models');

async function getTenant(req, res, next) {
  try {
    const tenant = await Tenant.findOne({ code: req.tenantId, isActive: true });
    res.json(tenant);
  } catch (error) {
    next(error);
  }
}

module.exports = { getTenant };
