const { startServer } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');

test('respons teks dikompres untuk klien yang mendukungnya', async () => {
  const server = await startServer();
  try {
    const compressed = await fetch(`${server.baseUrl}/app.css`, {
      headers: { 'accept-encoding': 'gzip, br' },
    });
    assert.ok(['br', 'gzip'].includes(compressed.headers.get('content-encoding')));

    const plain = await fetch(`${server.baseUrl}/app.css`, {
      headers: { 'accept-encoding': 'identity' },
    });
    assert.equal(plain.headers.get('content-encoding'), null);
    assert.ok(Number(plain.headers.get('content-length')) > 50_000);
  } finally {
    await server.close();
  }
});
