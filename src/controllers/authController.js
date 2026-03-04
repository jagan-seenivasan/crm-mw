const { body } = require('express-validator');
const ApiError = require('../utils/apiError');
const { authenticate } = require('../services/authService');
const { issueTokens, rotateRefreshToken, revokeRefreshToken } = require('../services/tokenService');

const loginValidation = [body('email').isEmail(), body('password').isString().isLength({ min: 6 })];
const refreshValidation = [body('refreshToken').isString().notEmpty()];

async function login(req, res, next) {
  try {
    const user = await authenticate({ tenantId: req.tenantId, ...req.body });
    const tokens = await issueTokens(user, req.tenantId);
    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      ...tokens
    });
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const tokens = await rotateRefreshToken(refreshToken, req.tenantId);
    res.json(tokens);
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ApiError(400, 'refreshToken required');
    await revokeRefreshToken(refreshToken, req.tenantId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { loginValidation, refreshValidation, login, refresh, logout };
