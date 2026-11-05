const path = require('node:path');
const express = require('express');
const compression = require('compression');
const { loadConfig } = require('./config');
const { createRouter } = require('./routes');
const { securityHeaders } = require('./security/headers');
const { csrfProtection } = require('./security/csrf');
const { requireFormBody } = require('./security/body');
const { createLimiters } = require('./security/rate-limit');
const { publicOrigin } = require('./urls');
const { icon } = require('./ui/icons');
const { readCookie } = require('./security/cookies');

const THEME_COOKIE = 'lq_tema';

// Membuat aplikasi Express tanpa langsung mendengarkan port, sehingga bisa
// dipakai oleh server maupun test. `rateLimits` menimpa batas bawaan
// (lihat security/rate-limit.js), misalnya untuk test.
function createApp({ config = loadConfig(), rateLimits } = {}) {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.set('config', config);
  // Helper tampilan yang tersedia di semua template.
  app.locals.icon = icon;
  app.disable('x-powered-by');
  // Menentukan dari mana req.ip dan req.secure dibaca saat berada di
  // belakang reverse proxy. Bawaan: tidak memercayai X-Forwarded-*.
  app.set('trust proxy', config.trustProxy);

  // Mengompres respons teks (HTML, CSS, JS, JSON, SVG) sebelum dikirim.
  app.use(compression());
  app.use(securityHeaders(config));
  // Kode status tersedia di template (dipakai halaman error).
  app.use((req, res, next) => {
    Object.defineProperty(res.locals, 'statusCode', { enumerable: true, get: () => res.statusCode });
    next();
  });
  app.use(express.static(path.join(__dirname, 'public')));
  // Halaman dinamis memuat token per browser, jadi tidak boleh di-cache.
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(requireFormBody);
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use(csrfProtection(config));
  // Origin publik untuk URL absolut di template (misalnya og:image), dan
  // tema pilihan pengguna (cookie preferensi, bukan data pribadi) agar
  // halaman langsung dirender dengan tema yang benar tanpa kedipan.
  app.use((req, res, next) => {
    res.locals.origin = publicOrigin(req);
    const theme = readCookie(req, THEME_COOKIE);
    res.locals.theme = theme === 'light' || theme === 'dark' ? theme : null;
    next();
  });
  app.use(createRouter(createLimiters(rateLimits)));

  app.use((req, res) => {
    res.status(404).render('error', {
      title: 'Halaman tidak ditemukan',
      message: 'Halaman atau agenda yang kamu cari tidak ada.',
    });
  });

  // Detail error hanya dicatat di server, tidak pernah ditampilkan ke pengguna.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).render('error', {
      title: 'Terjadi kesalahan',
      message: status === 500
        ? 'Maaf, terjadi kesalahan di server. Silakan coba lagi.'
        : 'Permintaan tidak dapat diproses.',
    });
  });

  return app;
}

module.exports = { createApp };
