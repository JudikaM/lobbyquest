const { startServer, Browser, agendaForm } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const { purgeExpiredAgendas } = require('../src/retention');

let server;
test.before(async () => { server = await startServer(); });
test.after(() => server.close());

test('agenda kedaluwarsa dihapus beserta peserta dan suaranya', async () => {
  const browser = new Browser(server.baseUrl);
  const created = await browser.post('/agenda', agendaForm());
  const agendaPath = created.headers.get('location').split('?')[0];
  const page = await browser.get(agendaPath);
  assert.match(page.text, /dihapus otomatis sekitar/);
  const option = /name="option" value="(\d+)"/.exec(page.text)[1];
  await browser.post(`${agendaPath}/suara`, [['name', 'Ani'], ['option', option]]);

  const count = (table) => db.prepare(`SELECT count(*) FROM ${table}`).pluck().get();
  assert.equal(count('agendas'), 1);
  assert.equal(count('votes'), 1);

  // Belum lewat batas: tidak dihapus.
  assert.equal(purgeExpiredAgendas(30), 0);

  // 40 hari setelah pilihan terakhir (dibuat ±3 hari ke depan): dihapus.
  const later = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
  assert.equal(purgeExpiredAgendas(30, later), 1);
  for (const table of ['agendas', 'time_options', 'participants', 'votes']) {
    assert.equal(count(table), 0, table);
  }
  assert.equal((await browser.get(agendaPath)).status, 404);
});
