const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/rbac');
const {
  listContactsValidation,
  createContactValidation,
  updateContactValidation,
  deleteContactValidation,
  listContacts,
  createContact,
  updateContact,
  deleteContact
} = require('../controllers/contactController');

const router = express.Router();

router.get('/', auth, requirePermission('CONTACT_READ'), listContactsValidation, validate, listContacts);
router.post('/', auth, requirePermission('CONTACT_WRITE'), createContactValidation, validate, createContact);
router.patch('/:id', auth, requirePermission('CONTACT_WRITE'), updateContactValidation, validate, updateContact);
router.delete('/:id', auth, requirePermission('CONTACT_WRITE'), deleteContactValidation, validate, deleteContact);

module.exports = router;
