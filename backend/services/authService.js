const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../database');
const config = require('../config');

const DAY_MS = 24 * 60 * 60 * 1000;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// A real hash to compare against when the email doesn't exist, so a wrong email
// takes as long as a wrong password and attackers can't tell which one was wrong.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4);

// bcrypt.hash / bcrypt.compare run on Node's worker thread pool, so they don't block other requests.
const hashPassword = (password) => bcrypt.hash(password, config.bcryptRounds);

async function verifyLogin(email, password) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  return ok && user ? user : null;
}

function signAccessToken(user) {
  return jwt.sign({ role: user.role, village: user.village }, config.jwtAccessSecret, {
    subject: String(user.id),
    expiresIn: config.accessTokenTtl,
    algorithm: 'HS256'
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtAccessSecret, { algorithms: ['HS256'] });
}

// The refresh token is a random string. Only its SHA-256 hash is stored, so a database leak can't be replayed.
async function issueRefreshToken(userId, db = prisma) {
  const token = crypto.randomBytes(48).toString('base64url');
  await db.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + config.refreshTokenDays * DAY_MS)
    }
  });
  return token;
}

// Rotation: each refresh token works once. Using it returns a new one and revokes the old one.
async function rotateRefreshToken(token) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true }
  });
  if (!stored) return null;

  if (stored.revokedAt) {
    // A revoked token being reused means it was probably stolen: log this user out everywhere.
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return null;
  }
  if (stored.expiresAt <= new Date()) return null;

  return prisma.$transaction(async (tx) => {
    const revoked = await tx.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    if (revoked.count !== 1) return null;
    const refreshToken = await issueRefreshToken(stored.userId, tx);
    return { user: stored.user, refreshToken };
  });
}

async function revokeRefreshToken(token) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(token), revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

const publicUser = (user) => ({ id: user.id, email: user.email, role: user.role, village: user.village });

module.exports = {
  hashPassword,
  verifyLogin,
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  publicUser
};
