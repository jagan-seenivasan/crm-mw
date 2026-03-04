const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/rbac');
const { createUserValidation, listUsers, createUser } = require('../controllers/userController');

const router = express.Router();
router.get('/', auth, requirePermission('USER_MANAGE'), listUsers);
router.post('/', auth, requirePermission('USER_MANAGE'), createUserValidation, validate, createUser);

module.exports = router;
