const crypto = require('node:crypto');
const { readCookie, cookieOptions } = require('./cookies');

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Nama cookie dengan awalan __Host- hanya bisa dipasang oleh origin ini
// sendiri lewat HTTPS, sehingga subdomain lain tidak bisa menimpanya.
function cookieName(config) {
  return config.isProduction ? '__Host-lq_csrf' : 'lq_csrf';
}

function sign(secret, value) {
  return crypto.createHmac('sha256', secret).update(`csrf:${value}`).digest('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function render403(res) {
  res.status(403).render('error', {
    title: 'Formulir kedaluwarsa',
    message: 'Demi keamanan, formulir ini tidak bisa diproses. Muat ulang halaman lalu kirim lagi.',
  });
}

// Asal request harus situs ini sendiri. Browser modern mengirim
// Sec-Fetch-Site dan Origin; jika ada dan tidak cocok, request ditolak.
//
// Origin "null" tidak dianggap lintas situs: browser mengirim nilai itu
// untuk POST dari halaman sendiri karena aplikasi memakai
// Referrer-Policy: no-referrer. Halaman lain (misalnya iframe sandbox)
// tetap tertolak lewat Sec-Fetch-Site, dan token bertanda tangan selalu
// wajib cocok.
function sameOrigin(req, config) {
  const site = req.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return false;

  const origin = req.get('origin');
  if (!origin || origin === 'null') return true;
  try {
    const { host } = new URL(origin);
    if (config.publicUrl) return origin === config.publicUrl;
    return host === req.get('host');
  } catch {
    return false;
  }
}

// Signed double-submit token: cookie berisi nilai acak, form berisi HMAC
// nilai itu dengan APP_SECRET. Penyerang tidak bisa membuat pasangan yang
// cocok tanpa mengetahui secret.
function csrfProtection(config) {
  const name = cookieName(config);

  return (req, res, next) => {
    let value = readCookie(req, name);
    if (!value || !TOKEN_PATTERN.test(value)) {
      value = crypto.randomBytes(32).toString('base64url');
      res.cookie(name, value, cookieOptions(req, { maxAge: MAX_AGE }));
    }
    res.locals.csrfToken = sign(config.appSecret, value);

    if (!UNSAFE_METHODS.has(req.method)) return next();

    const submitted = req.body && typeof req.body._csrf === 'string' ? req.body._csrf : '';
    if (!sameOrigin(req, config) || !safeEqual(submitted, res.locals.csrfToken)) {
      return render403(res);
    }
    return next();
  };
}

module.exports = { csrfProtection };
