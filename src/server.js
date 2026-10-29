const path = require('node:path');
const express = require('express');
require('./db');
const routes = require('./routes');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(status).render('error', {
    title: 'Terjadi kesalahan',
    message: status === 500
      ? 'Maaf, terjadi kesalahan di server. Silakan coba lagi.'
      : 'Permintaan tidak dapat diproses.',
  });
});

app.listen(port, () => {
  console.log(`LobbyQuest berjalan di http://localhost:${port}`);
});
