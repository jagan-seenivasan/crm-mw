const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/rbac');
const { searchValidation, search } = require('../controllers/searchController');

const router = express.Router();

router.get('/', auth, requirePermission('SEARCH_READ'), searchValidation, validate, search);

module.exports = router;
