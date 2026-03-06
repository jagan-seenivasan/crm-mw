const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/rbac');
const {
  listOpportunityValidation,
  createOpportunityValidation,
  updateOpportunityValidation,
  moveStageValidation,
  deleteOpportunityValidation,
  stageHistoryValidation,
  listOpportunities,
  exportOpportunities,
  createOpportunity,
  updateOpportunity,
  moveOpportunityStage,
  listStageHistory,
  deleteOpportunity
} = require('../controllers/opportunityController');

const router = express.Router();

router.get('/', auth, requirePermission('OPPORTUNITY_READ'), listOpportunityValidation, validate, listOpportunities);
router.get('/export', auth, requirePermission('OPPORTUNITY_READ'), listOpportunityValidation, validate, exportOpportunities);
router.get('/:id/stage-history', auth, requirePermission('OPPORTUNITY_READ'), stageHistoryValidation, validate, listStageHistory);
router.post(
  '/',
  auth,
  requirePermission('OPPORTUNITY_WRITE'),
  createOpportunityValidation,
  validate,
  createOpportunity
);
router.patch(
  '/:id',
  auth,
  requirePermission('OPPORTUNITY_WRITE'),
  updateOpportunityValidation,
  validate,
  updateOpportunity
);
router.patch(
  '/:id/stage',
  auth,
  requirePermission('OPPORTUNITY_WRITE'),
  moveStageValidation,
  validate,
  moveOpportunityStage
);
router.delete(
  '/:id',
  auth,
  requirePermission('OPPORTUNITY_WRITE'),
  deleteOpportunityValidation,
  validate,
  deleteOpportunity
);

module.exports = router;
