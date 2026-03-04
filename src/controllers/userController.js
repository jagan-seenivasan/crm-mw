const { body } = require('express-validator');
const { User } = require('../models');
const { registerUser } = require('../services/authService');
const { logAudit } = require('../services/auditService');

const createUserValidation = [
  body('name').isString().notEmpty(),
  body('email').isEmail(),
  body('password').isString().isLength({ min: 6 }),
  body('role').isIn(['OWNER', 'ADMIN', 'MANAGER', 'SALES'])
];

async function listUsers(req, res, next) {
  try {
    const users = await User.findByTenant(req.tenantId, {}, { password: 0 }).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const user = await registerUser({ tenantId: req.tenantId, ...req.body });
    await logAudit({
      tenantId: req.tenantId,
      actorId: req.user._id,
      action: 'CREATE_USER',
      entity: 'User',
      entityId: user._id,
      metadata: { email: user.email, role: user.role }
    });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    next(error);
  }
}

module.exports = { createUserValidation, listUsers, createUser };
