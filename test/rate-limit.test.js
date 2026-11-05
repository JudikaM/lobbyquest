const { startServer, Browser, agendaForm } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');

let server;
test.before(async () => {
  server = await startServer({
    rateLimits: {
      create: { limit: 2, windowMs: 60_000 },
      participate: { limit: 3, windowMs: 60_000 },
    },
  });
});
test.after(() => server.close());

test('pembuatan agenda dibatasi per IP', async () => {
  const browser = new Browser(server.baseUrl);
  assert.equal((await browser.post('/agenda', agendaForm())).status, 303);
  const second = await browser.post('/agenda', agendaForm());
  assert.equal(second.status, 303);
  const blocked = await browser.post('/agenda', agendaForm());
  assert.equal(blocked.status, 429);
  assert.match(blocked.text, /Pelan-pelan dulu/);
  assert.ok(blocked.headers.get('ratelimit-policy'));

  // Halaman biasa tetap bisa dibuka.
  assert.equal((await browser.get(second.headers.get('location'))).status, 200);
});

test('voting dibatasi per IP', async () => {
  const fresh = await startServer({ rateLimits: { participate: { limit: 2, windowMs: 60_000 } } });
  try {
    const browser = new Browser(fresh.baseUrl);
    const created = await browser.post('/agenda', agendaForm());
    const vote = `${created.headers.get('location').split('?')[0]}/suara`;
    assert.equal((await browser.post(vote, [['name', 'Ani']])).status, 303);
    assert.equal((await browser.post(vote, [['name', 'Ani']])).status, 303);
    assert.equal((await browser.post(vote, [['name', 'Ani']])).status, 429);
  } finally {
    await fresh.close();
  }
});
