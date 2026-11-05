const { startServer, Browser, agendaForm } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');

let server;
test.before(async () => { server = await startServer(); });
test.after(() => server.close());

async function create(browser) {
  const response = await browser.post('/agenda', agendaForm());
  assert.equal(response.status, 303);
  return response.headers.get('location').split('?')[0];
}

function managerCodeFrom(text) {
  return /#kode=([A-Za-z0-9_-]{43})/.exec(text)?.[1];
}

test('pembuat agenda otomatis menjadi pengelola lewat cookie httpOnly', async () => {
  const owner = new Browser(server.baseUrl);
  const created = await owner.post('/agenda', agendaForm());
  const location = created.headers.get('location');
  assert.doesNotMatch(location, /kode|token/i, 'token tidak dibawa di URL');
  const cookie = created.headers.getSetCookie().find((c) => c.startsWith('lq_kelola='));
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Path=\/a\/[A-Za-z0-9_-]{16}/);

  const page = await owner.get(location);
  assert.match(page.text, /Panel pengelola/);
  assert.ok(managerCodeFrom(page.text));
});

test('pengunjung lain tidak melihat panel pengelola', async () => {
  const owner = new Browser(server.baseUrl);
  const agendaPath = await create(owner);
  const page = await new Browser(server.baseUrl).get(agendaPath);
  assert.equal(page.status, 200);
  assert.doesNotMatch(page.text, /Panel pengelola/);
  assert.equal(managerCodeFrom(page.text), undefined);
});

test('database hanya menyimpan hash token pengelola', async () => {
  const owner = new Browser(server.baseUrl);
  const agendaPath = await create(owner);
  const code = managerCodeFrom((await owner.get(agendaPath)).text);
  const rows = db.prepare('SELECT * FROM agendas').all();
  for (const row of rows) {
    assert.ok(!Object.values(row).some((value) => String(value).includes(code)));
  }
});

test('kode pengelola dipakai di perangkat lain lewat POST', async () => {
  const owner = new Browser(server.baseUrl);
  const agendaPath = await create(owner);
  const code = managerCodeFrom((await owner.get(agendaPath)).text);

  const laptop = new Browser(server.baseUrl);
  const login = await laptop.get(`${agendaPath}/kelola`);
  assert.equal(login.status, 200);
  assert.match(login.text, /Masuk sebagai pengelola/);

  const wrong = await laptop.post(`${agendaPath}/kelola`, [['kode', 'A'.repeat(43)]]);
  assert.equal(wrong.status, 403);
  assert.match(wrong.text, /tidak cocok/);

  const ok = await laptop.post(`${agendaPath}/kelola`, [['kode', code]]);
  assert.equal(ok.status, 303);
  assert.match((await laptop.get(agendaPath)).text, /Panel pengelola/);
});

test('kode pengelola agenda lain tidak berlaku', async () => {
  const a = new Browser(server.baseUrl);
  const pathA = await create(a);
  const codeA = managerCodeFrom((await a.get(pathA)).text);
  const b = new Browser(server.baseUrl);
  const pathB = await create(b);

  const intruder = new Browser(server.baseUrl);
  await intruder.get(`${pathB}/kelola`);
  assert.equal((await intruder.post(`${pathB}/kelola`, [['kode', codeA]])).status, 403);
});

test('lupakan akses pengelola menghapus cookie', async () => {
  const owner = new Browser(server.baseUrl);
  const agendaPath = await create(owner);
  await owner.get(agendaPath);
  const response = await owner.post(`${agendaPath}/kelola/keluar`);
  assert.equal(response.status, 303);
  assert.ok(!owner.cookies.has('lq_kelola'));
  assert.doesNotMatch((await owner.get(agendaPath)).text, /Panel pengelola/);
  assert.equal((await owner.post(`${agendaPath}/kelola/keluar`)).status, 403);
});

test('route pengelola untuk agenda yang tidak ada menghasilkan 404', async () => {
  const browser = new Browser(server.baseUrl);
  assert.equal((await browser.get('/a/AAAAAAAAAAAAAAAA/kelola')).status, 404);
});
