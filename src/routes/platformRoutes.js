const express = require('express');
const validate = require('../middleware/validate');
const platformAuth = require('../middleware/platformAuth');
const { createPlatformTenantValidation, createPlatformTenant } = require('../controllers/platformController');

const router = express.Router();

router.post('/tenants', platformAuth, createPlatformTenantValidation, validate, createPlatformTenant);

module.exports = router;
