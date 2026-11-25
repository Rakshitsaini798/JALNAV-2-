const express = require('express');
const router = express.Router();
const config = require('../config');
const { HttpError } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { createRateLimiter } = require('../utils/rateLimiter');
const auth = require('../services/authService');
const prisma = require('../database');

// 5 login attempts per 15 minutes per IP, stored in Postgres so it works across restarts.
const loginLimiter = createRateLimiter({
  limit: Number(process.env.LOGIN_RATE_LIMIT || 5),
  windowMs: 15 * 60 * 1000,
  prefix: 'login:',
  message: 'Too many login attempts. Please wait and try again.'
});

const cookieOptions = {
  httpOnly: true, // JavaScript can't read it, so an XSS bug can't steal it
  secure: config.isProduction, // HTTPS only in production
  sameSite: 'strict', // the browser won't send it from other sites (CSRF protection)
  path: '/api', // only sent to our API
  maxAge: config.refreshTokenDays * 24 * 60 * 60 * 1000
};

function sendSession(res, user, refreshToken) {
  res.cookie(config.refreshCookieName, refreshToken, cookieOptions);
  res.json({ accessToken: auth.signAccessToken(user), expiresIn: 900, user: auth.publicUser(user) });
}

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      throw new HttpError(400, 'email and password are required');
    }
    const user = await auth.verifyLogin(email.trim(), password);
    if (!user) throw new HttpError(401, 'Invalid email or password.');
    const refreshToken = await auth.issueRefreshToken(user.id);
    sendSession(res, user, refreshToken);
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies[config.refreshCookieName];
    if (!token) throw new HttpError(401, 'No session. Log in again.');
    const session = await auth.rotateRefreshToken(token);
    if (!session) {
      res.clearCookie(config.refreshCookieName, { ...cookieOptions, maxAge: undefined });
      throw new HttpError(401, 'Your session has expired. Log in again.');
    }
    sendSession(res, session.user, session.refreshToken);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies[config.refreshCookieName];
    if (token) await auth.revokeRefreshToken(token);
    res.clearCookie(config.refreshCookieName, { ...cookieOptions, maxAge: undefined });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new HttpError(401, 'This account no longer exists.');
    res.json(auth.publicUser(user));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
