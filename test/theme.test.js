const { startServer, Browser } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');

let server;
test.before(async () => { server = await startServer(); });
test.after(() => server.close());

test('tanpa cookie tema, halaman mengikuti preferensi perangkat', async () => {
  const { text } = await new Browser(server.baseUrl).get('/');
  assert.match(text, /<html lang="id">/);
  assert.match(text, /<meta name="color-scheme" content="light dark">/);
  assert.match(text, /media="\(prefers-color-scheme: dark\)"/);
  assert.match(text, /data-theme-value="system"\s*>|aria-checked="true" data-theme-value="system"/);
});

test('cookie tema dirender langsung di elemen html', async () => {
  for (const theme of ['light', 'dark']) {
    const browser = new Browser(server.baseUrl);
    browser.cookies.set('lq_tema', { value: theme, path: '/' });
    const { text } = await browser.get('/');
    assert.match(text, new RegExp(`<html lang="id" data-theme="${theme}">`));
    assert.match(text, new RegExp(`<meta name="color-scheme" content="${theme}">`));
    assert.match(text, new RegExp(`aria-checked="true" data-theme-value="${theme}"`));
  }
});

test('nilai cookie tema yang tidak dikenal diabaikan', async () => {
  const browser = new Browser(server.baseUrl);
  browser.cookies.set('lq_tema', { value: '"><script>alert(1)</script>', path: '/' });
  const { text } = await browser.get('/');
  assert.match(text, /<html lang="id">/);
  assert.doesNotMatch(text, /data-theme="/);
});
