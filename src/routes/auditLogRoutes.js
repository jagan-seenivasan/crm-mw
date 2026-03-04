const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/rbac');
const { listAuditLogsValidation, listAuditLogs } = require('../controllers/auditLogController');

const router = express.Router();
router.get('/', auth, requirePermission('AUDIT_READ'), listAuditLogsValidation, validate, listAuditLogs);

module.exports = router;
