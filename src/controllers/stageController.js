const { body, param, query } = require('express-validator');
const { stageRepository } = require('../repositories');
const ApiError = require('../utils/apiError');

const listStageValidation = [
  query('type')
    .optional({ values: 'falsy' })
    .isIn(['LEAD', 'OPPORTUNITY'])
    .withMessage('type must be LEAD or OPPORTUNITY')
];

const createStageValidation = [
  body('name').isString().notEmpty(),
  body('order').isInt({ min: 1 }),
  body('type')
    .optional({ values: 'falsy' })
    .isIn(['LEAD', 'OPPORTUNITY'])
    .withMessage('type must be LEAD or OPPORTUNITY')
];

const updateStageValidation = [
  param('id').isMongoId(),
  body('type')
    .optional({ values: 'falsy' })
    .isIn(['LEAD', 'OPPORTUNITY'])
    .withMessage('type must be LEAD or OPPORTUNITY')
];

async function listStages(req, res, next) {
  try {
    const stages = await stageRepository.list(req.tenantId, req.query.type);
    res.json(stages);
  } catch (error) {
    next(error);
  }
}

async function createStage(req, res, next) {
  try {
    const payload = { ...req.body, type: req.body.type || 'LEAD' };
    const stage = await stageRepository.create(req.tenantId, payload);
    res.status(201).json(stage);
  } catch (error) {
    next(error);
  }
}

async function updateStage(req, res, next) {
  try {
    const stage = await stageRepository.updateById(req.tenantId, req.params.id, req.body);
    if (!stage) throw new ApiError(404, 'Stage not found');
    res.json(stage);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listStageValidation,
  createStageValidation,
  updateStageValidation,
  listStages,
  createStage,
  updateStage
};
