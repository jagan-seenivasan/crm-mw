const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/rbac');
const {
  listStageValidation,
  createStageValidation,
  updateStageValidation,
  listStages,
  createStage,
  updateStage
} = require('../controllers/stageController');

const router = express.Router();
router.get('/', auth, listStageValidation, validate, listStages);
router.post('/', auth, requirePermission('STAGE_MANAGE'), createStageValidation, validate, createStage);
router.patch('/:id', auth, requirePermission('STAGE_MANAGE'), updateStageValidation, validate, updateStage);

module.exports = router;
