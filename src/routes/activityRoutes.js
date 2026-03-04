const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/rbac');
const { listActivityValidation, listActivity } = require('../controllers/activityController');

const router = express.Router();

router.get('/', auth, requirePermission('ACTIVITY_READ'), listActivityValidation, validate, listActivity);

module.exports = router;
