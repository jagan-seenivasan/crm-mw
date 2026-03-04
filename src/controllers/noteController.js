const { body, query } = require('express-validator');
const { noteRepository } = require('../repositories');

const ENTITY_TYPES = ['LEAD', 'ACCOUNT', 'CONTACT', 'OPPORTUNITY'];

const listNotesValidation = [
  query('entityType').isIn(ENTITY_TYPES).withMessage('entityType is invalid'),
  query('entityId').isMongoId().withMessage('entityId must be valid')
];

const createNoteValidation = [
  body('entityType').isIn(ENTITY_TYPES).withMessage('entityType is invalid'),
  body('entityId').isMongoId().withMessage('entityId must be valid'),
  body('content').trim().notEmpty().withMessage('content is required')
];

async function listNotes(req, res, next) {
  try {
    const notes = await noteRepository.listByEntity(req.tenantId, req.query.entityType, req.query.entityId);
    res.json(notes);
  } catch (error) {
    next(error);
  }
}

async function createNote(req, res, next) {
  try {
    const note = await noteRepository.create(req.tenantId, {
      entityType: req.body.entityType,
      entityId: req.body.entityId,
      content: req.body.content,
      createdBy: req.user._id
    });
    const populated = await noteRepository
      .scopedFindOne(req.tenantId, { _id: note._id })
      .populate({ path: 'createdBy', select: 'name email', options: { tenantId: req.tenantId } });
    res.status(201).json(populated || note);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listNotesValidation,
  createNoteValidation,
  listNotes,
  createNote
};
