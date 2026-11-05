const { startServer, Browser, agendaForm } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const { agendaStatus } = require('../src/agendas');

let server;
test.before(async () => { server = await startServer(); });
test.after(() => server.close());

async function setup() {
  const owner = new Browser(server.baseUrl);
  const created = await owner.post('/agenda', agendaForm());
  const agendaPath = created.headers.get('location').split('?')[0];
  const page = await owner.get(agendaPath);
  const optionIds = [...page.text.matchAll(/name="option" value="(\d+)"/g)].map((m) => m[1]);
  return { owner, agendaPath, optionIds: [...new Set(optionIds)] };
}

test('agendaStatus menghitung status dari data', () => {
  const now = new Date('2026-11-05T00:00:00Z');
  const future = { id: 1, starts_at: '2026-11-10T12:00:00.000Z', ends_at: '2026-11-10T15:00:00.000Z' };
  const past = { id: 2, starts_at: '2026-11-01T12:00:00.000Z', ends_at: '2026-11-01T15:00:00.000Z' };
  assert.equal(agendaStatus({ timeOptions: [future, past], finalOption: null }, now), 'voting');
  assert.equal(agendaStatus({ timeOptions: [past], finalOption: null }, now), 'expired');
  assert.equal(agendaStatus({ timeOptions: [future], finalOption: future }, now), 'scheduled');
  assert.equal(agendaStatus({ timeOptions: [past], finalOption: past }, now), 'done');
});

test('pengelola menetapkan waktu final; voting ditutup', async () => {
  const { owner, agendaPath, optionIds } = await setup();
  const friend = new Browser(server.baseUrl);
  await friend.post(`${agendaPath}/suara`, [['name', 'Ani'], ['option', optionIds[1]]]);

  let page = await owner.get(agendaPath);
  assert.match(page.text, /Voting berlangsung/);

  const response = await owner.post(`${agendaPath}/tetapkan`, [['option', optionIds[1]]]);
  assert.equal(response.status, 303);
  page = await owner.get(agendaPath);
  assert.match(page.text, /Waktu ditetapkan/);
  assert.match(page.text, /Waktu final/);

  const late = await friend.post(`${agendaPath}/suara`, [['name', 'Ani'], ['option', optionIds[0]]]);
  assert.equal(late.status, 409);
});

test('peserta biasa tidak bisa menetapkan waktu atau membuka voting', async () => {
  const { agendaPath, optionIds } = await setup();
  const friend = new Browser(server.baseUrl);
  await friend.get(agendaPath);
  assert.equal((await friend.post(`${agendaPath}/tetapkan`, [['option', optionIds[0]]])).status, 403);
  assert.equal((await friend.post(`${agendaPath}/buka-voting`)).status, 403);

  // Cookie pengelola palsu juga ditolak.
  friend.cookies.set('lq_kelola', { value: 'B'.repeat(43), path: agendaPath });
  assert.equal((await friend.post(`${agendaPath}/tetapkan`, [['option', optionIds[0]]])).status, 403);
});

test('pilihan waktu dari agenda lain atau yang sudah lewat ditolak', async () => {
  const a = await setup();
  const b = await setup();
  assert.equal((await a.owner.post(`${a.agendaPath}/tetapkan`, [['option', b.optionIds[0]]])).status, 422);
  assert.equal((await a.owner.post(`${a.agendaPath}/tetapkan`, [['option', 'abc']])).status, 422);

  db.prepare("UPDATE time_options SET starts_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(Number(a.optionIds[0]));
  assert.equal((await a.owner.post(`${a.agendaPath}/tetapkan`, [['option', a.optionIds[0]]])).status, 422);
});

test('pengelola bisa membuka voting lagi', async () => {
  const { owner, agendaPath, optionIds } = await setup();
  await owner.post(`${agendaPath}/tetapkan`, [['option', optionIds[0]]]);
  const reopen = await owner.post(`${agendaPath}/buka-voting`);
  assert.equal(reopen.status, 303);
  assert.match((await owner.get(agendaPath)).text, /Voting berlangsung/);
  assert.equal((await owner.post(`${agendaPath}/buka-voting`)).status, 409);
});

test('agenda dengan waktu final yang sudah lewat berstatus selesai', async () => {
  const { owner, agendaPath, optionIds } = await setup();
  await owner.post(`${agendaPath}/tetapkan`, [['option', optionIds[0]]]);
  db.prepare(`UPDATE time_options SET starts_at = '2020-01-01T10:00:00.000Z', ends_at = '2020-01-01T12:00:00.000Z' WHERE id = ?`)
    .run(Number(optionIds[0]));
  const page = await owner.get(agendaPath);
  assert.match(page.text, /status-done/);
  assert.match(page.text, /Sudah berlangsung/);
  assert.equal((await owner.post(`${agendaPath}/tetapkan`, [['option', optionIds[1]]])).status, 422);
});
