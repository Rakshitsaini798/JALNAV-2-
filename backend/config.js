const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';

function readSecret(name) {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (isProduction) {
    throw new Error(`${name} must be set to at least 32 characters in production`);
  }
  console.warn(`[config] ${name} is not set. Using a random secret for this run only.`);
  return crypto.randomBytes(48).toString('hex');
}

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = {
  isProduction,
  port: Number(process.env.PORT) || 3000,
  corsOrigins,
  jwtAccessSecret: readSecret('JWT_ACCESS_SECRET'),
  accessTokenTtl: '15m',
  refreshTokenDays: 7,
  refreshCookieName: 'jn_refresh',
  bcryptRounds: 12
};
