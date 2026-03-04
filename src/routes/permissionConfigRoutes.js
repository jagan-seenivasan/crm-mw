const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/rbac');
const {
  updatePermissionConfigValidation,
  getPermissionConfig,
  updatePermissionConfig
} = require('../controllers/permissionConfigController');

const router = express.Router();

router.get('/', auth, requirePermission('PERMISSION_CONFIG_MANAGE'), getPermissionConfig);
router.patch('/', auth, requirePermission('PERMISSION_CONFIG_MANAGE'), updatePermissionConfigValidation, validate, updatePermissionConfig);

module.exports = router;
