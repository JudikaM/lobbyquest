const { startServer, Browser, agendaForm } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config');

test('loadConfig memakai nilai bawaan yang aman', () => {
  const config = loadConfig({});
  assert.equal(config.port, 3000);
  assert.equal(config.isProduction, false);
  assert.equal(config.trustProxy, false);
  assert.equal(config.publicUrl, null);
  assert.ok(config.appSecret.length >= 32);
});

test('production wajib APP_SECRET yang cukup panjang', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /APP_SECRET/);
  assert.throws(() => loadConfig({ NODE_ENV: 'production', APP_SECRET: 'pendek' }), /APP_SECRET/);
  assert.doesNotThrow(() => loadConfig({ NODE_ENV: 'production', APP_SECRET: 'x'.repeat(32) }));
});

test('nilai env yang tidak valid ditolak', () => {
  assert.throws(() => loadConfig({ PORT: 'abc' }), /PORT/);
  assert.throws(() => loadConfig({ PUBLIC_URL: 'javascript:alert(1)' }), /PUBLIC_URL/);
  assert.throws(() => loadConfig({ RETENTION_DAYS: '0' }), /RETENTION_DAYS/);
  assert.equal(loadConfig({ PUBLIC_URL: 'https://lq.example/path/' }).publicUrl, 'https://lq.example');
  assert.equal(loadConfig({ TRUST_PROXY: '1' }).trustProxy, 1);
});

test('tautan berbagi memakai PUBLIC_URL, bukan header Host', async () => {
  const server = await startServer({ config: { publicUrl: 'https://lobby.example' } });
  try {
    const browser = new Browser(server.baseUrl);
    const created = await browser.post('/agenda', agendaForm());
    const page = await browser.get(created.headers.get('location'), { headers: { host: 'evil.example' } });
    assert.match(page.text, /value="https:\/\/lobby\.example\/a\/[A-Za-z0-9_-]{16}"/);
    assert.doesNotMatch(page.text, /evil\.example/);
  } finally {
    await server.close();
  }
});
