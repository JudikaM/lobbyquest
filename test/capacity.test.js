const { startServer, Browser, agendaForm } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAgenda } = require('../src/agendas');

let server;
test.before(async () => { server = await startServer(); });
test.after(() => server.close());

test('kuota party opsional dan dibatasi 2–50', () => {
  const base = Object.fromEntries(agendaForm().filter(([k]) => k !== 'start' && k !== 'end'));
  const body = (capacity) => ({ ...base, capacity, start: ['2099-01-01T10:00', '2099-01-02T10:00'], end: ['2099-01-01T12:00', '2099-01-02T12:00'] });
  assert.equal(validateAgenda(body('')).agenda.capacity, null);
  assert.equal(validateAgenda(body('5')).agenda.capacity, 5);
  for (const bad of ['1', '51', '2.5', '-3', 'lima', '1e1']) {
    assert.ok(validateAgenda(body(bad)).errors.length, bad);
  }
});

test('konfirmasi hadir ditolak saat party penuh, "mungkin" tetap bisa', async () => {
  const owner = new Browser(server.baseUrl);
  const created = await owner.post('/agenda', agendaForm({ capacity: '2' }));
  const agendaPath = created.headers.get('location').split('?')[0];
  const page = await owner.get(agendaPath);
  assert.match(page.text, /kuota hadir 2/);
  const optionId = /name="option" value="(\d+)"/.exec(page.text)[1];
  await owner.post(`${agendaPath}/tetapkan`, [['option', optionId]]);

  const [a, b, c] = [1, 2, 3].map(() => new Browser(server.baseUrl));
  assert.equal((await a.post(`${agendaPath}/hadir`, [['name', 'A'], ['status', 'yes']])).status, 303);
  assert.equal((await b.post(`${agendaPath}/hadir`, [['name', 'B'], ['status', 'yes']])).status, 303);
  const full = await c.post(`${agendaPath}/hadir`, [['name', 'C'], ['status', 'yes']]);
  assert.equal(full.status, 409);
  assert.match(full.text, /Party sudah penuh/);
  assert.equal((await c.post(`${agendaPath}/hadir`, [['name', 'C'], ['status', 'maybe']])).status, 303);

  // Peserta yang sudah hadir tetap bisa menyimpan ulang, dan slot terbuka
  // lagi setelah ada yang mundur.
  assert.equal((await a.post(`${agendaPath}/hadir`, [['name', 'A'], ['status', 'yes']])).status, 303);
  await b.post(`${agendaPath}/hadir`, [['name', 'B'], ['status', 'no']]);
  assert.equal((await c.post(`${agendaPath}/hadir`, [['name', 'C'], ['status', 'yes']])).status, 303);
  assert.match((await c.get(agendaPath)).text, /2\/2<\/strong> slot terisi · party penuh/);
});
