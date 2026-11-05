// Helper kecil untuk tampilan. Semua nilai yang dikembalikan berupa teks
// atau nama class tetap, sehingga aman dipakai dengan <%= %> dan tidak butuh
// inline style (CSP melarang style="").

const AVATAR_COLORS = 8;
const segmenter = new Intl.Segmenter('id', { granularity: 'grapheme' });

// Huruf atau emoji pertama dari nama, misalnya "budi" → "B", "🎮 Ani" → "🎮".
function initial(name) {
  const first = segmenter.segment(name.trim()).containing(0);
  return first ? first.segment.toLocaleUpperCase('id') : '?';
}

// Warna avatar tetap untuk peserta yang sama, dipilih dari ID-nya.
function avatarClass(id) {
  return `avatar-${Number(id) % AVATAR_COLORS}`;
}

// Lebar bar ketersediaan dalam kelipatan 10% (class fill-0 … fill-10).
function fillClass(count, total) {
  if (!total) return 'fill-0';
  return `fill-${Math.round((Math.min(count, total) / total) * 10)}`;
}

module.exports = { initial, avatarClass, fillClass };
