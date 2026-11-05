const { startServer, Browser, agendaForm } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');

let server;
test.before(async () => { server = await startServer(); });
test.after(() => server.close());

test('respons memuat security headers dan CSP ketat', async () => {
  const response = await new Browser(server.baseUrl).get('/');
  const csp = response.headers.get('content-security-policy');
  assert.ok(csp);
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.match(csp, /style-src 'self'(;|$)/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /form-action 'self'/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|https?:/);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(response.headers.get('permissions-policy'), /camera=\(\)/);
});

test('file statis juga mendapat security headers', async () => {
  const response = await new Browser(server.baseUrl).get('/app.css');
  assert.equal(response.status, 200);
  assert.ok(response.headers.get('content-security-policy'));
});

test('HTML tidak memuat inline script, inline handler, atau inline style', async () => {
  const browser = new Browser(server.baseUrl);
  const created = await browser.post('/agenda', agendaForm());
  const pages = ['/', '/agenda/baru', '/desain', created.headers.get('location'), '/tidak-ada'];
  for (const page of pages) {
    const { text } = await browser.get(page);
    assert.doesNotMatch(text, /<script(?![^>]*\bsrc=)[^>]*>/i, `inline script di ${page}`);
    assert.doesNotMatch(text, /\son[a-z]+\s*=/i, `inline handler di ${page}`);
    assert.doesNotMatch(text, /\sstyle\s*=/i, `inline style di ${page}`);
  }
});

test('health check tidak membocorkan detail server', async () => {
  const response = await new Browser(server.baseUrl).get('/health');
  assert.deepEqual(JSON.parse(response.text), { status: 'ok' });
});
