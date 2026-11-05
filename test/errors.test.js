const { startServer, Browser, agendaForm } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');

const LEAKS = /\bat \w+.*\(|node_modules|\/home\/|\\src\\|SQLITE|better-sqlite3|database connection|stack/i;

test('error 4xx tidak membocorkan detail', async () => {
  const server = await startServer();
  try {
    const browser = new Browser(server.baseUrl);
    const malformed = await browser.get('/a/%E0%A4%A');
    assert.ok(malformed.status >= 400 && malformed.status < 500);
    assert.doesNotMatch(malformed.text, LEAKS);

    await browser.get('/agenda/baru');
    const tooLarge = await browser.post('/agenda', [...agendaForm(), ['description', 'x'.repeat(30_000)]]);
    assert.equal(tooLarge.status, 413);
    assert.doesNotMatch(tooLarge.text, LEAKS);
  } finally {
    await server.close();
  }
});

test('error 500 di production hanya menampilkan pesan umum', async (t) => {
  const server = await startServer({ config: { isProduction: true, nodeEnv: 'production' } });
  const logged = t.mock.method(console, 'error', () => {});
  try {
    const browser = new Browser(server.baseUrl);
    db.close();
    const response = await browser.get('/a/AAAAAAAAAAAAAAAA');
    assert.equal(response.status, 500);
    assert.match(response.text, /terjadi kesalahan di server/);
    assert.doesNotMatch(response.text, LEAKS);
    assert.ok(logged.mock.callCount() >= 1, 'detail tetap dicatat di log server');
  } finally {
    await server.close();
  }
});
