const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/rbac');
const {
  createTaskValidation,
  updateTaskValidation,
  deleteTaskValidation,
  listTaskValidation,
  listTasks,
  createTask,
  updateTask,
  deleteTask
} = require('../controllers/taskController');

const router = express.Router();
router.get('/', auth, requirePermission('TASK_READ'), listTaskValidation, validate, listTasks);
router.post('/', auth, requirePermission('TASK_WRITE'), createTaskValidation, validate, createTask);
router.patch('/:id', auth, requirePermission('TASK_WRITE'), updateTaskValidation, validate, updateTask);
router.delete('/:id', auth, requirePermission('TASK_WRITE'), deleteTaskValidation, validate, deleteTask);

module.exports = router;
