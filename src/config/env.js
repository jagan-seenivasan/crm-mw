const path = require('path');
const dotenv = require('dotenv');

const nodeEnv = process.env.NODE_ENV || 'development';
const defaultEnvFile =
  nodeEnv === 'production'
    ? '.env.production'
    : nodeEnv === 'staging'
      ? '.env.staging'
      : '.env';

const envFile = process.env.ENV_FILE || defaultEnvFile;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

module.exports = {
  nodeEnv,
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenExpires: process.env.ACCESS_TOKEN_EXPIRES || '15m',
  refreshTokenExpiresDays: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4300',
  platformApiEnabled: String(process.env.PLATFORM_API_ENABLED || 'false').toLowerCase() === 'true',
  platformApiSecret: process.env.PLATFORM_API_SECRET || ''
};
