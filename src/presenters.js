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

// Kelas lebar mark data dalam langkah 2% (w-0 … w-100); nilai bukan nol
// minimal w-2 agar bar kecil tetap terlihat.
function widthClass(count, total) {
  if (!total || !count) return 'w-0';
  const pct = Math.min(count, total) / total * 100;
  return `w-${Math.max(2, Math.round(pct / 2) * 2)}`;
}

// Bobot flex untuk segmented bar (g-0 … g-50).
function growClass(count) {
  return `g-${Math.max(0, Math.min(50, Number(count) || 0))}`;
}

module.exports = { initial, avatarClass, widthClass, growClass };
