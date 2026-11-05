const crypto = require('node:crypto');
const db = require('./db');

const COOKIE = 'lq_kelola';
const COOKIE_MAX_AGE = 180 * 24 * 60 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function hashToken(token) {
  return crypto.createHash('sha256').update(`manager:${token}`).digest();
}

// 32 byte acak = 256 bit, ditulis sebagai 43 karakter base64url.
function generateToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token).toString('hex') };
}

const selectHash = db.prepare('SELECT manager_token_hash FROM agendas WHERE id = ?').pluck();

// Memeriksa token pengelola untuk agenda tertentu dengan perbandingan
// constant-time terhadap hash yang tersimpan.
function verifyToken(agendaId, token) {
  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) return false;
  const stored = selectHash.get(agendaId);
  if (!stored) return false;
  const expected = Buffer.from(stored, 'hex');
  const actual = hashToken(token);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

module.exports = { COOKIE, COOKIE_MAX_AGE, generateToken, verifyToken };
