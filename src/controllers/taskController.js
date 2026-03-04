const { body, param, query } = require('express-validator');
const { taskRepository } = require('../repositories');
const ApiError = require('../utils/apiError');
const { logAudit } = require('../services/auditService');

const createTaskValidation = [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('assignedTo')
    .notEmpty()
    .withMessage('Assigned user is required')
    .bail()
    .isMongoId()
    .withMessage('Assigned user must be a valid user id'),
  body('leadId').optional({ values: 'falsy' }).isMongoId().withMessage('Lead must be a valid lead id'),
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Status must be TODO, IN_PROGRESS, or DONE')
];

const updateTaskValidation = [param('id').isMongoId()];
const deleteTaskValidation = [param('id').isMongoId().withMessage('Task id must be valid')];

const listTaskValidation = [
  query('assignedTo')
    .optional({ values: 'falsy' })
    .custom((value) => value === 'me' || /^[a-f\d]{24}$/i.test(value))
    .withMessage('assignedTo must be a valid user id or "me"'),
  query('status')
    .optional({ values: 'falsy' })
    .isIn(['TODO', 'IN_PROGRESS', 'DONE'])
    .withMessage('status must be TODO, IN_PROGRESS, or DONE')
];

async function listTasks(req, res, next) {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.assignedTo) {
      filter.assignedTo = req.query.assignedTo === 'me' ? req.user._id : req.query.assignedTo;
    }

    const tasks = await taskRepository.list(req.tenantId, filter);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
}

async function createTask(req, res, next) {
  try {
    const task = await taskRepository.create(req.tenantId, req.body);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    const task = await taskRepository.updateById(req.tenantId, req.params.id, req.body);
    if (!task) throw new ApiError(404, 'Task not found');
    res.json(task);
  } catch (error) {
    next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    const before = await taskRepository.findById(req.tenantId, req.params.id);
    if (!before) throw new ApiError(404, 'Task not found');

    const deleted = await taskRepository.remove(req.tenantId, req.params.id);
    if (!deleted.deletedCount) throw new ApiError(404, 'Task not found');

    await logAudit({
      tenantId: req.tenantId,
      actorId: req.user._id,
      action: 'DELETE_TASK',
      entity: 'Task',
      entityId: req.params.id,
      metadata: { before: before.toObject() }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTaskValidation,
  updateTaskValidation,
  deleteTaskValidation,
  listTaskValidation,
  listTasks,
  createTask,
  updateTask,
  deleteTask
};
