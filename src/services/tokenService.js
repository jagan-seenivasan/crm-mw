const env = require('../config/env');
const ApiError = require('../utils/apiError');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { RefreshToken } = require('../models');

function getRefreshExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + env.refreshTokenExpiresDays);
  return date;
}

function parseRefreshToken(token) {
  try {
    return verifyRefreshToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Refresh token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid refresh token');
    }
    throw error;
  }
}

async function issueTokens(user, tenantId) {
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role, tenantId });
  const { token: refreshToken, jti } = signRefreshToken({
    sub: user._id.toString(),
    role: user.role,
    tenantId
  });

  await RefreshToken.create({
    tenantId,
    userId: user._id,
    tokenId: jti,
    expiresAt: getRefreshExpiryDate()
  });

  return { accessToken, refreshToken };
}

async function rotateRefreshToken(token, tenantId) {
  const payload = parseRefreshToken(token);
  if (payload.tenantId !== tenantId) {
    throw new ApiError(403, 'Tenant mismatch on refresh');
  }

  const current = await RefreshToken.findOne({
    tenantId,
    userId: payload.sub,
    tokenId: payload.jti,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  });

  if (!current) {
    throw new ApiError(401, 'Refresh token invalid or expired');
  }

  const { token: newRefreshToken, jti: newJti } = signRefreshToken({
    sub: payload.sub,
    role: payload.role,
    tenantId
  });
  await RefreshToken.updateOne(
    { _id: current._id, tenantId },
    { revokedAt: new Date(), replacedByTokenId: newJti }
  );

  await RefreshToken.create({
    tenantId,
    userId: payload.sub,
    tokenId: newJti,
    expiresAt: getRefreshExpiryDate()
  });

  const accessToken = signAccessToken({ sub: payload.sub, role: payload.role, tenantId });
  return { accessToken, refreshToken: newRefreshToken, userId: payload.sub };
}

async function revokeRefreshToken(token, tenantId) {
  const payload = parseRefreshToken(token);
  await RefreshToken.updateOne(
    { tenantId, userId: payload.sub, tokenId: payload.jti, revokedAt: null },
    { revokedAt: new Date() }
  );
}

module.exports = { issueTokens, rotateRefreshToken, revokeRefreshToken };
