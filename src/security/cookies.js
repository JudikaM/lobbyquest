// Membaca satu cookie dari header tanpa dependency tambahan.
function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      return part.slice(index + 1).trim();
    }
  }
  return null;
}

// Opsi dasar semua cookie aplikasi: tidak bisa dibaca JavaScript, tidak
// dikirim pada request lintas situs selain navigasi biasa, dan hanya lewat
// HTTPS saat production.
function cookieOptions(req, extra = {}) {
  const { isProduction } = req.app.get('config');
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction || req.secure,
    path: '/',
    ...extra,
  };
}

module.exports = { readCookie, cookieOptions };
