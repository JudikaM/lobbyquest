const { startServer, Browser, agendaForm } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { shareLinks } = require('../src/share');

test('tautan berbagi di-encode dengan benar', () => {
  const links = shareLinks('https://lq.example/a/abc', 'Mabar & "nongkrong" <b>');
  assert.equal(
    links.whatsapp,
    'https://wa.me/?text=Mabar%20%26%20%22nongkrong%22%20%3Cb%3E%20https%3A%2F%2Flq.example%2Fa%2Fabc'
  );
  assert.match(links.telegram, /^https:\/\/t\.me\/share\/url\?url=https%3A%2F%2Flq\.example%2Fa%2Fabc&text=/);
});

test('halaman agenda memuat tautan WhatsApp dan Telegram yang aman', async () => {
  const server = await startServer({ config: { publicUrl: 'https://lq.example' } });
  try {
    const browser = new Browser(server.baseUrl);
    const created = await browser.post('/agenda', agendaForm({ title: 'Mabar "seru" <img>' }));
    const page = await browser.get(created.headers.get('location'));
    assert.match(page.text, /href="https:\/\/wa\.me\/\?text=Mabar%20%22seru%22%20%3Cimg%3E/);
    assert.match(page.text, /rel="noopener noreferrer"/);
    assert.doesNotMatch(page.text, /<img>/);
  } finally {
    await server.close();
  }
});
