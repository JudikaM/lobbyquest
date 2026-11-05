// Karakter kontrol (kecuali tab dan baris baru) dan karakter pengatur arah
// teks (bidi). Bidi override bisa dipakai untuk memalsukan tampilan teks,
// misalnya membuat nama atau tautan terbaca terbalik.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const BIDI = /[؜‎‏‪-‮⁦-⁩]/g;

// Membersihkan teks dari form. Bukan string → string kosong. Teks satu
// baris dirapatkan spasinya; teks multi-baris mempertahankan baris baru,
// maksimal satu baris kosong berturut-turut.
function cleanText(value, { multiline = false } = {}) {
  if (typeof value !== 'string') return '';

  let text = value
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(BIDI, '')
    .replace(CONTROL, '');

  if (multiline) {
    text = text
      .replace(/[^\S\n]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n');
  } else {
    text = text.replace(/\s+/g, ' ');
  }
  return text.trim();
}

// Mengubah nilai form yang bisa tunggal atau berulang menjadi array.
function list(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

module.exports = { cleanText, list };
