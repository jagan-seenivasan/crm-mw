const { body, param, query } = require('express-validator');
const { contactRepository } = require('../repositories');
const ApiError = require('../utils/apiError');

const listContactsValidation = [
  query('accountId').optional({ values: 'falsy' }).isMongoId().withMessage('accountId must be valid')
];

const createContactValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('email').isEmail().withMessage('Email must be valid'),
  body('accountId').isMongoId().withMessage('Account id must be valid')
];

const updateContactValidation = [
  param('id').isMongoId().withMessage('Contact id must be valid'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Email must be valid'),
  body('accountId').optional({ values: 'falsy' }).isMongoId().withMessage('Account id must be valid')
];

const deleteContactValidation = [param('id').isMongoId().withMessage('Contact id must be valid')];

async function listContacts(req, res, next) {
  try {
    const filter = {};
    if (req.query.accountId) {
      filter.accountId = req.query.accountId;
    }
    const contacts = await contactRepository.list(req.tenantId, filter);
    res.json(contacts);
  } catch (error) {
    next(error);
  }
}

async function createContact(req, res, next) {
  try {
    const contact = await contactRepository.create(req.tenantId, req.body);
    res.status(201).json(contact);
  } catch (error) {
    next(error);
  }
}

async function updateContact(req, res, next) {
  try {
    const updated = await contactRepository.updateById(req.tenantId, req.params.id, req.body);
    if (!updated) throw new ApiError(404, 'Contact not found');
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

async function deleteContact(req, res, next) {
  try {
    const deleted = await contactRepository.deleteById(req.tenantId, req.params.id);
    if (!deleted.deletedCount) throw new ApiError(404, 'Contact not found');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listContactsValidation,
  createContactValidation,
  updateContactValidation,
  deleteContactValidation,
  listContacts,
  createContact,
  updateContact,
  deleteContact
};
