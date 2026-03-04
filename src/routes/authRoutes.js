const express = require('express');
const validate = require('../middleware/validate');
const { loginValidation, refreshValidation, login, refresh, logout } = require('../controllers/authController');

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with tenant context
 */
router.post('/login', loginValidation, validate, login);
router.post('/refresh', refreshValidation, validate, refresh);
router.post('/logout', refreshValidation, validate, logout);

module.exports = router;
