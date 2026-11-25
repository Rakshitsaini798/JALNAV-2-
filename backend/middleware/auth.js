const { HttpError } = require('./errorHandler');
const { verifyAccessToken } = require('../services/authService');

// Authentication: who are you? Missing or invalid token -> 401.
function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    res.set('WWW-Authenticate', 'Bearer');
    return next(new HttpError(401, 'Log in first. Send your access token as "Authorization: Bearer <token>".'));
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: Number(payload.sub), role: payload.role, village: payload.village || null };
    return next();
  } catch (err) {
    res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
    return next(new HttpError(401, 'Your session has expired or the token is invalid. Log in again.'));
  }
}

// Authorization: are you allowed? Logged in but wrong role -> 403.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, `This action needs one of these roles: ${roles.join(', ')}.`));
    }
    return next();
  };
}

// Ownership: an operator can only manage assets in their own village. Admins can manage all.
function assertCanManageVillage(user, village) {
  if (user.role === 'admin') return;
  if (!user.village || String(village).trim().toLowerCase() !== user.village.toLowerCase()) {
    throw new HttpError(403, `You can only manage assets in ${user.village || 'your own village'}.`);
  }
}

module.exports = { requireAuth, requireRole, assertCanManageVillage };
