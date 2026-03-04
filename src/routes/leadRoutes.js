const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/rbac');
const {
  createLeadValidation,
  updateLeadValidation,
  listLeadValidation,
  convertLeadValidation,
  importLeadValidation,
  listLeads,
  exportLeads,
  createLead,
  updateLead,
  deleteLead,
  convertLeadHandler,
  importLeads
} = require('../controllers/leadController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file || !file.originalname || !file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(new Error('Only .csv files are allowed'));
    }
    cb(null, true);
  }
});

router.get('/', auth, requirePermission('LEAD_READ'), listLeadValidation, validate, listLeads);
router.get('/export', auth, requirePermission('LEAD_READ'), listLeadValidation, validate, exportLeads);
router.post('/', auth, requirePermission('LEAD_WRITE'), createLeadValidation, validate, createLead);
router.post('/import', auth, requirePermission('LEAD_WRITE'), upload.single('file'), importLeadValidation, validate, importLeads);
router.post('/:id/convert', auth, requirePermission('LEAD_WRITE'), convertLeadValidation, validate, convertLeadHandler);
router.patch('/:id', auth, requirePermission('LEAD_WRITE'), updateLeadValidation, validate, updateLead);
router.delete('/:id', auth, requirePermission('LEAD_WRITE'), updateLeadValidation, validate, deleteLead);

module.exports = router;
