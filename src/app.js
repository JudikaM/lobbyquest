const path = require('node:path');
const express = require('express');
const { loadConfig } = require('./config');
const routes = require('./routes');

// Membuat aplikasi Express tanpa langsung mendengarkan port, sehingga bisa
// dipakai oleh server maupun test.
function createApp({ config = loadConfig() } = {}) {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.set('config', config);

  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use(routes);

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
