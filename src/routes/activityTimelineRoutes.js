const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/rbac');
const {
  getActivityTimelineValidation,
  getActivityTimeline
} = require('../controllers/activityTimelineController');

const router = express.Router();

router.get('/', auth, requirePermission('ACTIVITY_READ'), getActivityTimelineValidation, validate, getActivityTimeline);

module.exports = router;
