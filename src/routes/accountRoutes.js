const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/rbac');
const {
  createAccountValidation,
  updateAccountValidation,
  deleteAccountValidation,
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount
} = require('../controllers/accountController');

const router = express.Router();

router.get('/', auth, requirePermission('ACCOUNT_READ'), listAccounts);
router.post('/', auth, requirePermission('ACCOUNT_WRITE'), createAccountValidation, validate, createAccount);
router.patch('/:id', auth, requirePermission('ACCOUNT_WRITE'), updateAccountValidation, validate, updateAccount);
router.delete('/:id', auth, requirePermission('ACCOUNT_WRITE'), deleteAccountValidation, validate, deleteAccount);

module.exports = router;
