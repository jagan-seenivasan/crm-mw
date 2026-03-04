const { body, param, query } = require('express-validator');
const { savedFilterRepository } = require('../repositories');
const ApiError = require('../utils/apiError');

const MODULES = ['LEADS', 'OPPORTUNITIES'];

const listSavedFiltersValidation = [query('module').isIn(MODULES).withMessage('module must be LEADS or OPPORTUNITIES')];

const createSavedFilterValidation = [
  body('module').isIn(MODULES).withMessage('module must be LEADS or OPPORTUNITIES'),
  body('name').trim().notEmpty().withMessage('name is required'),
  body('filters').optional().isObject().withMessage('filters must be an object')
];

const updateSavedFilterValidation = [
  param('id').isMongoId().withMessage('Saved filter id must be valid'),
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('filters').optional().isObject().withMessage('filters must be an object')
];

const deleteSavedFilterValidation = [param('id').isMongoId().withMessage('Saved filter id must be valid')];

async function listSavedFilters(req, res, next) {
  try {
    const items = await savedFilterRepository.listByModule(req.tenantId, req.query.module, req.user._id);
    res.json(items);
  } catch (error) {
    next(error);
  }
}

async function createSavedFilter(req, res, next) {
  try {
    const item = await savedFilterRepository.create(req.tenantId, {
      module: req.body.module,
      name: req.body.name,
      filters: req.body.filters || {},
      createdBy: req.user._id
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

async function updateSavedFilter(req, res, next) {
  try {
    const item = await savedFilterRepository.scopedFindOne(req.tenantId, {
      _id: req.params.id,
      createdBy: req.user._id
    });
    if (!item) throw new ApiError(404, 'Saved filter not found');

    const payload = {};
    if (typeof req.body.name === 'string') payload.name = req.body.name;
    if (req.body.filters && typeof req.body.filters === 'object') payload.filters = req.body.filters;

    const updated = await savedFilterRepository.updateById(req.tenantId, req.params.id, payload);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

async function deleteSavedFilter(req, res, next) {
  try {
    const item = await savedFilterRepository.scopedFindOne(req.tenantId, {
      _id: req.params.id,
      createdBy: req.user._id
    });
    if (!item) throw new ApiError(404, 'Saved filter not found');

    const deleted = await savedFilterRepository.deleteById(req.tenantId, req.params.id);
    if (!deleted.deletedCount) throw new ApiError(404, 'Saved filter not found');

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listSavedFiltersValidation,
  createSavedFilterValidation,
  updateSavedFilterValidation,
  deleteSavedFilterValidation,
  listSavedFilters,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter
};
