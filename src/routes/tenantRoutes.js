const express = require('express');
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/rbac');
const { getTenant } = require('../controllers/tenantController');

const router = express.Router();
router.get('/me', auth, requirePermission('TENANT_READ'), getTenant);

module.exports = router;
