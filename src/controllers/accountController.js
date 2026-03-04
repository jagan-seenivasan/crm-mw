const { body, param } = require('express-validator');
const { accountRepository } = require('../repositories');
const { logAudit } = require('../services/auditService');
const ApiError = require('../utils/apiError');

const createAccountValidation = [
  body('name').trim().notEmpty().withMessage('Account name is required'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Email must be valid')
];

const updateAccountValidation = [
  param('id').isMongoId().withMessage('Account id must be valid'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Email must be valid')
];

const deleteAccountValidation = [param('id').isMongoId().withMessage('Account id must be valid')];

async function listAccounts(req, res, next) {
  try {
    const accounts = await accountRepository.list(req.tenantId);
    res.json(accounts);
  } catch (error) {
    next(error);
  }
}

async function createAccount(req, res, next) {
  try {
    const account = await accountRepository.create(req.tenantId, req.body);
    await logAudit({
      tenantId: req.tenantId,
      actorId: req.user._id,
      action: 'CREATE_ACCOUNT',
      entity: 'Account',
      entityId: account._id,
      metadata: { after: account.toObject() }
    });
    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
}

async function updateAccount(req, res, next) {
  try {
    const before = await accountRepository.findById(req.tenantId, req.params.id);
    if (!before) {
      throw new ApiError(404, 'Account not found');
    }

    const account = await accountRepository.updateById(req.tenantId, req.params.id, req.body);
    await logAudit({
      tenantId: req.tenantId,
      actorId: req.user._id,
      action: 'UPDATE_ACCOUNT',
      entity: 'Account',
      entityId: account._id,
      metadata: { before: before.toObject(), after: account.toObject() }
    });
    res.json(account);
  } catch (error) {
    next(error);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const before = await accountRepository.findById(req.tenantId, req.params.id);
    if (!before) {
      throw new ApiError(404, 'Account not found');
    }

    const deleted = await accountRepository.deleteById(req.tenantId, req.params.id);
    if (!deleted.deletedCount) {
      throw new ApiError(404, 'Account not found');
    }

    await logAudit({
      tenantId: req.tenantId,
      actorId: req.user._id,
      action: 'DELETE_ACCOUNT',
      entity: 'Account',
      entityId: req.params.id,
      metadata: { before: before.toObject() }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createAccountValidation,
  updateAccountValidation,
  deleteAccountValidation,
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount
};
