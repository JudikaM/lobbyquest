const { startServer, Browser, agendaForm } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');

let server;
test.before(async () => { server = await startServer(); });
test.after(() => server.close());

test('setiap form POST memuat token CSRF', async () => {
  const browser = new Browser(server.baseUrl);
  const form = await browser.get('/agenda/baru');
  assert.match(form.text, /name="_csrf" value="[A-Za-z0-9_-]{43}"/);
  const created = await browser.post('/agenda', agendaForm());
  const agenda = await browser.get(created.headers.get('location'));
  assert.match(agenda.text, /name="_csrf"/);
});

test('cookie CSRF httpOnly dan SameSite=Lax', async () => {
  const response = await new Browser(server.baseUrl).get('/');
  const cookie = response.headers.getSetCookie().find((c) => c.startsWith('lq_csrf='));
  assert.ok(cookie);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
});

test('POST tanpa token CSRF ditolak', async () => {
  const browser = new Browser(server.baseUrl);
  await browser.get('/agenda/baru');
  const response = await browser.post('/agenda', agendaForm(), { csrf: false });
  assert.equal(response.status, 403);
});

test('token dari browser lain tidak berlaku', async () => {
  const attacker = new Browser(server.baseUrl);
  await attacker.get('/agenda/baru');
  const victim = new Browser(server.baseUrl);
  await victim.get('/agenda/baru');
  const response = await victim.post('/agenda', [...agendaForm(), ['_csrf', attacker.csrfToken]]);
  assert.equal(response.status, 403);
});

test('request lintas situs ditolak walau token benar', async () => {
  const browser = new Browser(server.baseUrl);
  await browser.get('/agenda/baru');
  let response = await browser.post('/agenda', agendaForm(), { headers: { 'sec-fetch-site': 'cross-site' } });
  assert.equal(response.status, 403);
  response = await browser.post('/agenda', agendaForm(), { headers: { origin: 'https://evil.example' } });
  assert.equal(response.status, 403);
  response = await browser.post('/agenda', agendaForm(), { headers: { origin: server.baseUrl, 'sec-fetch-site': 'same-origin' } });
  assert.equal(response.status, 303);
});

test('cookie CSRF yang dimanipulasi diganti dan token lama ditolak', async () => {
  const browser = new Browser(server.baseUrl);
  await browser.get('/agenda/baru');
  const token = browser.csrfToken;
  browser.cookies.set('lq_csrf', { value: 'x'.repeat(43), path: '/' });
  const response = await browser.post('/agenda', [...agendaForm(), ['_csrf', token]]);
  assert.equal(response.status, 403);
});

test('di production cookie CSRF memakai awalan __Host- dan Secure', async () => {
  const prod = await startServer({ config: { isProduction: true, nodeEnv: 'production' } });
  try {
    const response = await new Browser(prod.baseUrl).get('/agenda/baru');
    const cookie = response.headers.getSetCookie().find((c) => c.startsWith('__Host-lq_csrf='));
    assert.ok(cookie, 'cookie __Host-lq_csrf');
    assert.match(cookie, /; Secure/i);
    assert.match(cookie, /; Path=\//i);
    assert.doesNotMatch(cookie, /Domain=/i);
  } finally {
    await prod.close();
  }
});

test('POST dari halaman sendiri dengan Origin "null" diterima (Referrer-Policy no-referrer)', async () => {
  const browser = new Browser(server.baseUrl);
  await browser.get('/agenda/baru');
  const response = await browser.post('/agenda', agendaForm(), {
    headers: { origin: 'null', 'sec-fetch-site': 'same-origin' },
  });
  assert.equal(response.status, 303);
});

test('Origin "null" dari situs lain tetap ditolak', async () => {
  const browser = new Browser(server.baseUrl);
  await browser.get('/agenda/baru');
  const response = await browser.post('/agenda', agendaForm(), {
    headers: { origin: 'null', 'sec-fetch-site': 'cross-site' },
  });
  assert.equal(response.status, 403);
});

test('Origin "null" tanpa token yang cocok tetap ditolak', async () => {
  const browser = new Browser(server.baseUrl);
  await browser.get('/agenda/baru');
  const response = await browser.post('/agenda', [...agendaForm(), ['_csrf', 'x'.repeat(43)]], {
    headers: { origin: 'null' },
  });
  assert.equal(response.status, 403);
});
