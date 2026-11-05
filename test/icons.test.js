require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { icon, iconNames } = require('../src/ui/icons');
const names = require('../src/ui/icon-names');

test('icon() dekoratif disembunyikan dari pembaca layar', () => {
  const svg = icon('calendar');
  assert.match(svg, /^<svg class="icon" /);
  assert.match(svg, /aria-hidden="true"/);
  assert.match(svg, /stroke="currentColor"/);
  assert.match(svg, /width="16" height="16"/);
  assert.doesNotMatch(svg, /style=|<script|on[a-z]+=/i);
});

test('icon() dengan label punya nama aksesibel yang di-escape', () => {
  const svg = icon('copy', { size: 20, label: 'Salin "tautan" <x>', className: 'a b' });
  assert.match(svg, /role="img" aria-label="Salin &quot;tautan&quot; &lt;x&gt;"/);
  assert.match(svg, /class="icon a b"/);
  assert.doesNotMatch(svg, /aria-hidden/);
});

test('ketebalan garis menyesuaikan ukuran ikon', () => {
  assert.match(icon('sun', { size: 16 }), /stroke-width="2"/);
  assert.match(icon('sun', { size: 24 }), /stroke-width="1.75"/);
  assert.match(icon('sun', { size: 48 }), /stroke-width="1.5"/);
});

test('nama ikon yang tidak terdaftar ditolak', () => {
  assert.throws(() => icon('not-an-icon'), /tidak terdaftar/);
  assert.throws(() => icon('__proto__'), /tidak terdaftar/);
});

test('registry berisi tepat ikon yang didaftarkan', () => {
  assert.deepEqual([...iconNames].sort(), [...new Set(names)].sort());
});

test('registry sinkron dengan paket lucide-static', (t) => {
  let build;
  try {
    build = require('../scripts/build-icons');
    require.resolve('lucide-static/package.json');
  } catch {
    t.skip('lucide-static tidak terpasang');
    return;
  }
  const current = fs.readFileSync(build.OUT, 'utf8');
  assert.equal(current, build.serialize(build.buildRegistry()), 'jalankan npm run icons');
});

test('setiap icon(\'...\') di template dan kode terdaftar', () => {
  const root = path.join(__dirname, '..', 'src');
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ejs|js)$/.test(entry.name)) files.push(full);
    }
  };
  walk(root);
  const used = new Set();
  for (const file of files) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/\bicon\(\s*'([a-z0-9-]+)'/g)) {
      used.add(match[1]);
    }
  }
  const registered = new Set(iconNames);
  const missing = [...used].filter((name) => !registered.has(name));
  assert.deepEqual(missing, [], `ikon belum terdaftar: ${missing.join(', ')}`);
});
