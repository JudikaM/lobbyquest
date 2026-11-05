// Origin publik aplikasi untuk tautan absolut (tautan berbagi, kalender,
// preview). PUBLIC_URL dipakai jika diatur agar tautan tidak bergantung
// pada header Host yang dikirim klien.
function publicOrigin(req) {
  const { publicUrl } = req.app.get('config');
  if (publicUrl) return publicUrl;
  return `${req.protocol}://${req.get('host')}`;
}

module.exports = { publicOrigin };
