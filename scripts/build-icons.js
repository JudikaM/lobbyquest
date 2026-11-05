// Menyalin ikon Lucide yang dipakai (src/ui/icon-names.js) dari paket
// lucide-static ke src/ui/lucide-icons.json. Hanya isi <svg> yang disimpan;
// atribut <svg> dibuat oleh helper icon() di src/ui/icons.js.
//
//   npm run icons            → menulis ulang file JSON
//   node scripts/build-icons.js --check → gagal jika file tidak sinkron
const fs = require('node:fs');
const path = require('node:path');

const names = require('../src/ui/icon-names');
const OUT = path.join(__dirname, '..', 'src', 'ui', 'lucide-icons.json');

function lucideDir() {
  return path.dirname(require.resolve('lucide-static/package.json'));
}

function innerSvg(source) {
  const open = source.indexOf('>', source.indexOf('<svg'));
  const close = source.lastIndexOf('</svg>');
  if (open < 0 || close < 0) throw new Error('SVG tidak valid');
  return source
    .slice(open + 1, close)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('');
}

function buildRegistry() {
  const dir = lucideDir();
  const { version } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const icons = {};
  for (const name of [...new Set(names)].sort()) {
    const file = path.join(dir, 'icons', `${name}.svg`);
    if (!fs.existsSync(file)) throw new Error(`Ikon Lucide tidak ditemukan: ${name}`);
    icons[name] = innerSvg(fs.readFileSync(file, 'utf8'));
  }
  return {
    $source: `lucide-static ${version} (ISC License, lihat NOTICE.md)`,
    icons,
  };
}

function serialize(registry) {
  return `${JSON.stringify(registry, null, 2)}\n`;
}

if (require.main === module) {
  const next = serialize(buildRegistry());
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== next) {
      console.error('src/ui/lucide-icons.json tidak sinkron. Jalankan: npm run icons');
      process.exit(1);
    }
    console.log('Registry ikon sinkron.');
  } else {
    fs.writeFileSync(OUT, next);
    console.log(`Menulis ${Object.keys(JSON.parse(next).icons).length} ikon ke ${path.relative(process.cwd(), OUT)}`);
  }
}

module.exports = { buildRegistry, serialize, OUT };
