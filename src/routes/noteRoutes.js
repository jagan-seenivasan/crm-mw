const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/rbac');
const { listNotesValidation, createNoteValidation, listNotes, createNote } = require('../controllers/noteController');

const router = express.Router();

router.get('/', auth, requirePermission('NOTE_READ'), listNotesValidation, validate, listNotes);
router.post('/', auth, requirePermission('NOTE_WRITE'), createNoteValidation, validate, createNote);

module.exports = router;
