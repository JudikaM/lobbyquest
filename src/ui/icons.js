const { icons } = require('./lucide-icons.json');

// Ketebalan garis dibuat konsisten secara visual: 2 untuk ikon kecil (UI),
// lebih tipis untuk ikon besar agar tidak terlihat berat.
function defaultStroke(size) {
  if (size >= 32) return 1.5;
  if (size >= 24) return 1.75;
  return 2;
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Merender ikon Lucide sebagai SVG inline (aman untuk CSP karena tidak ada
// script maupun style). Nama ikon harus terdaftar di icon-names.js, sehingga
// input pengguna tidak pernah bisa memilih atau menyisipkan markup.
//
//   icon('calendar')                         → dekoratif, aria-hidden
//   icon('copy', { size: 20, label: 'Salin' }) → punya nama aksesibel
function icon(name, { size = 16, className = '', label = '', strokeWidth } = {}) {
  if (typeof name !== 'string' || !Object.hasOwn(icons, name)) {
    throw new Error(`Ikon tidak terdaftar: ${name}`);
  }
  const body = icons[name];

  const px = Number(size);
  const stroke = Number(strokeWidth || defaultStroke(px));
  const classes = ['icon', className].filter(Boolean).join(' ');
  const a11y = label
    ? `role="img" aria-label="${escapeAttr(label)}"`
    : 'aria-hidden="true" focusable="false"';

  return `<svg class="${escapeAttr(classes)}" xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body}</svg>`;
}

module.exports = { icon, iconNames: Object.keys(icons) };
