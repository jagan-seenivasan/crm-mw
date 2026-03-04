const express = require('express');
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/rbac');
const { getDashboard } = require('../controllers/dashboardController');

const router = express.Router();
router.get('/', auth, requirePermission('DASHBOARD_READ'), getDashboard);

module.exports = router;
