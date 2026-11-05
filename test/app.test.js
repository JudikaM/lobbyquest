const { startServer, Browser, agendaForm } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');

let server;
test.before(async () => { server = await startServer(); });
test.after(() => server.close());

async function createAgenda(browser, overrides) {
  const response = await browser.post('/agenda', agendaForm(overrides));
  assert.equal(response.status, 303, response.text);
  return new URL(response.headers.get('location'), server.baseUrl).pathname;
}

test('beranda dan health check dapat diakses', async () => {
  const browser = new Browser(server.baseUrl);
  assert.equal((await browser.get('/')).status, 200);
  const health = await browser.get('/health');
  assert.equal(health.status, 200);
  assert.equal(JSON.parse(health.text).status, 'ok');
});

test('membuat agenda lalu membuka halamannya', async () => {
  const browser = new Browser(server.baseUrl);
  const agendaPath = await createAgenda(browser);
  assert.match(agendaPath, /^\/a\/[A-Za-z0-9_-]{16}$/);
  const page = await browser.get(agendaPath);
  assert.equal(page.status, 200);
  assert.match(page.text, /Mabar ranked Sabtu/);
});

test('slug yang tidak ada atau tidak valid menghasilkan 404', async () => {
  const browser = new Browser(server.baseUrl);
  assert.equal((await browser.get('/a/AAAAAAAAAAAAAAAA')).status, 404);
  assert.equal((await browser.get('/a/1')).status, 404);
});

test('input pengguna di-escape (XSS)', async () => {
  const browser = new Browser(server.baseUrl);
  const payload = '<script>alert(1)</script>';
  const agendaPath = await createAgenda(browser, { title: payload, description: '"><img src=x onerror=alert(1)>' });
  const page = await browser.get(agendaPath);
  assert.ok(!page.text.includes(payload));
  assert.ok(!page.text.includes('<img src=x'));
  assert.match(page.text, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('form dengan format selain urlencoded ditolak dengan 415', async () => {
  const response = await fetch(`${server.baseUrl}/agenda`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
    redirect: 'manual',
  });
  assert.equal(response.status, 415);
});

test('voting: peserta bisa mengubah suara dari browser yang sama saja', async () => {
  const owner = new Browser(server.baseUrl);
  const agendaPath = await createAgenda(owner);
  const page = await owner.get(agendaPath);
  const optionIds = [...new Set([...page.text.matchAll(/name="option" value="(\d+)"/g)].map((m) => m[1]))];
  assert.equal(optionIds.length, 2);

  const budi = new Browser(server.baseUrl);
  let response = await budi.post(`${agendaPath}/suara`, [['name', 'Budi'], ['option', optionIds[0]]]);
  assert.equal(response.status, 303);
  assert.ok(budi.cookies.has('lq_peserta'));

  response = await budi.post(`${agendaPath}/suara`, [['name', 'Budi'], ['option', optionIds[1]]]);
  assert.equal(response.status, 303);

  const other = new Browser(server.baseUrl);
  await other.post(`${agendaPath}/suara`, [['name', 'Budi'], ['option', optionIds[0]]]);

  const result = await owner.get(agendaPath);
  assert.match(result.text, /2 orang sudah memilih/);
});

test('voting menolak pilihan waktu milik agenda lain', async () => {
  const browser = new Browser(server.baseUrl);
  const agendaPath = await createAgenda(browser);
  const response = await browser.post(`${agendaPath}/suara`, [['name', 'Ani'], ['option', '999999']]);
  assert.equal(response.status, 422);
});

test('peserta bisa menghapus datanya sendiri, tidak data orang lain', async () => {
  const owner = new Browser(server.baseUrl);
  const agendaPath = await createAgenda(owner);
  const page = await owner.get(agendaPath);
  const optionId = /name="option" value="(\d+)"/.exec(page.text)[1];

  const ani = new Browser(server.baseUrl);
  const budi = new Browser(server.baseUrl);
  await ani.post(`${agendaPath}/suara`, [['name', 'Ani'], ['option', optionId]]);
  await budi.post(`${agendaPath}/suara`, [['name', 'Budi'], ['option', optionId]]);
  assert.match((await ani.get(agendaPath)).text, /Hapus namaku/);

  const response = await ani.post(`${agendaPath}/keluar`);
  assert.equal(response.status, 303);
  assert.ok(!ani.cookies.has('lq_peserta'));
  const after = await owner.get(agendaPath);
  assert.match(after.text, /1 orang sudah memilih/);
  assert.match(after.text, /Budi/);
  assert.doesNotMatch(after.text, /Ani/);

  // Tanpa cookie peserta: tidak ada yang terhapus.
  await new Browser(server.baseUrl).post(`${agendaPath}/keluar`);
  assert.match((await owner.get(agendaPath)).text, /1 orang sudah memilih/);
});

test('halaman sistem desain menampilkan komponen dan semua ikon terdaftar', async () => {
  const browser = new Browser(server.baseUrl);
  const page = await browser.get('/desain');
  assert.equal(page.status, 200);
  assert.match(page.text, /Ready Room/);
  const { iconNames } = require('../src/ui/icons');
  for (const name of iconNames) assert.ok(page.text.includes(`<span class="mono">${name}</span>`), name);
});
