const { User } = require('../models');
const ApiError = require('../utils/apiError');

async function registerUser({ tenantId, name, email, password, role }) {
  const exists = await User.findOneByTenant(tenantId, { email: email.toLowerCase() });
  if (exists) {
    throw new ApiError(409, 'User email already exists for tenant');
  }
  return User.create({ tenantId, name, email: email.toLowerCase(), password, role });
}

async function authenticate({ tenantId, email, password }) {
  const user = await User.findOneByTenant(tenantId, { email: email.toLowerCase(), isActive: true }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid credentials');
  }
  return user;
}

module.exports = { registerUser, authenticate };
