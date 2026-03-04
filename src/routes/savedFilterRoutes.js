const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/rbac');
const {
  listSavedFiltersValidation,
  createSavedFilterValidation,
  updateSavedFilterValidation,
  deleteSavedFilterValidation,
  listSavedFilters,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter
} = require('../controllers/savedFilterController');

const router = express.Router();

router.get('/', auth, requirePermission('SAVED_FILTER_READ'), listSavedFiltersValidation, validate, listSavedFilters);
router.post('/', auth, requirePermission('SAVED_FILTER_WRITE'), createSavedFilterValidation, validate, createSavedFilter);
router.patch('/:id', auth, requirePermission('SAVED_FILTER_WRITE'), updateSavedFilterValidation, validate, updateSavedFilter);
router.delete('/:id', auth, requirePermission('SAVED_FILTER_WRITE'), deleteSavedFilterValidation, validate, deleteSavedFilter);

module.exports = router;
