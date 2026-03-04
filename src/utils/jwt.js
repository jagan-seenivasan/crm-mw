const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.accessTokenExpires });
}

function signRefreshToken(payload) {
  const jti = uuidv4();
  const token = jwt.sign({ ...payload, jti }, env.jwtRefreshSecret, {
    expiresIn: `${env.refreshTokenExpiresDays}d`
  });
  return { token, jti };
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
