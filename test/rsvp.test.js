const { startServer, Browser, agendaForm } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');

let server;
test.before(async () => { server = await startServer(); });
test.after(() => server.close());

async function scheduledAgenda() {
  const owner = new Browser(server.baseUrl);
  const created = await owner.post('/agenda', agendaForm());
  const agendaPath = created.headers.get('location').split('?')[0];
  const page = await owner.get(agendaPath);
  const optionIds = [...new Set([...page.text.matchAll(/name="option" value="(\d+)"/g)].map((m) => m[1]))];
  await owner.post(`${agendaPath}/tetapkan`, [['option', optionIds[0]]]);
  return { owner, agendaPath, optionIds };
}

// Jumlah per status dari stat tile ready check (data-count).
function summaryCount(text, key) {
  const match = new RegExp(`stat-${key}" data-count="(\\d+)"`).exec(text);
  return match ? Number(match[1]) : null;
}

test('konfirmasi kehadiran hanya dibuka setelah waktu ditetapkan', async () => {
  const owner = new Browser(server.baseUrl);
  const created = await owner.post('/agenda', agendaForm());
  const agendaPath = created.headers.get('location').split('?')[0];
  const page = await owner.get(agendaPath);
  assert.doesNotMatch(page.text, /Konfirmasi kehadiran/);
  const response = await owner.post(`${agendaPath}/hadir`, [['name', 'Ani'], ['status', 'yes']]);
  assert.equal(response.status, 409);
});

test('peserta mengonfirmasi lalu mengubahnya dari browser yang sama', async () => {
  const { agendaPath } = await scheduledAgenda();
  const ani = new Browser(server.baseUrl);
  let response = await ani.post(`${agendaPath}/hadir`, [['name', 'Ani'], ['status', 'yes']]);
  assert.equal(response.status, 303);
  let page = await ani.get(agendaPath);
  assert.equal(summaryCount(page.text, 'yes'), 1);
  assert.match(page.text, /value="yes" required\s+checked/);

  response = await ani.post(`${agendaPath}/hadir`, [['name', 'Ani'], ['status', 'maybe']]);
  assert.equal(response.status, 303);
  page = await ani.get(agendaPath);
  assert.equal(summaryCount(page.text, 'yes'), 0);
  assert.equal(summaryCount(page.text, 'maybe'), 1);

  // Browser lain dengan nama sama menjadi peserta terpisah.
  const other = new Browser(server.baseUrl);
  await other.post(`${agendaPath}/hadir`, [['name', 'Ani'], ['status', 'no']]);
  page = await other.get(agendaPath);
  assert.equal(summaryCount(page.text, 'maybe'), 1);
  assert.equal(summaryCount(page.text, 'no'), 1);
});

test('pemilih yang belum konfirmasi ditampilkan sebagai belum konfirmasi', async () => {
  const owner = new Browser(server.baseUrl);
  const created = await owner.post('/agenda', agendaForm());
  const agendaPath = created.headers.get('location').split('?')[0];
  const page = await owner.get(agendaPath);
  const optionId = /name="option" value="(\d+)"/.exec(page.text)[1];
  const budi = new Browser(server.baseUrl);
  await budi.post(`${agendaPath}/suara`, [['name', 'Budi'], ['option', optionId]]);
  await owner.post(`${agendaPath}/tetapkan`, [['option', optionId]]);
  assert.match((await budi.get(agendaPath)).text, /Belum konfirmasi: Budi/);
});

test('status RSVP yang tidak dikenal ditolak', async () => {
  const { agendaPath } = await scheduledAgenda();
  const browser = new Browser(server.baseUrl);
  for (const status of ['', 'hadir', 'constructor', '__proto__']) {
    const response = await browser.post(`${agendaPath}/hadir`, [['name', 'Ani'], ['status', status]]);
    assert.equal(response.status, 422, status);
  }
});

test('mengganti waktu final mengosongkan konfirmasi lama', async () => {
  const { owner, agendaPath, optionIds } = await scheduledAgenda();
  const ani = new Browser(server.baseUrl);
  await ani.post(`${agendaPath}/hadir`, [['name', 'Ani'], ['status', 'yes']]);
  await owner.post(`${agendaPath}/tetapkan`, [['option', optionIds[1]]]);
  const page = await ani.get(agendaPath);
  assert.equal(summaryCount(page.text, 'yes'), 0);
  assert.match(page.text, /Belum konfirmasi: Ani/);
});

test('konfirmasi ditutup setelah agenda selesai', async () => {
  const { agendaPath, optionIds } = await scheduledAgenda();
  db.prepare(`UPDATE time_options SET starts_at = '2020-01-01T10:00:00.000Z', ends_at = '2020-01-01T12:00:00.000Z' WHERE id = ?`)
    .run(Number(optionIds[0]));
  const browser = new Browser(server.baseUrl);
  const page = await browser.get(agendaPath);
  assert.match(page.text, /Konfirmasi kehadiran/);
  assert.doesNotMatch(page.text, /action="[^"]*\/hadir"/);
  assert.equal((await browser.post(`${agendaPath}/hadir`, [['name', 'Ani'], ['status', 'yes']])).status, 409);
});
