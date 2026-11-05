const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Semua form aplikasi memakai application/x-www-form-urlencoded. Request
// tanpa body diperlakukan sebagai form kosong; format lain ditolak.
function requireFormBody(req, res, next) {
  if (!UNSAFE_METHODS.has(req.method)) return next();
  if (req.is('application/x-www-form-urlencoded') !== false) return next();

  return res.status(415).render('error', {
    title: 'Format tidak didukung',
    message: 'Kirim data melalui form yang tersedia di halaman.',
  });
}

module.exports = { requireFormBody };
