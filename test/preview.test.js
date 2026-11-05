const { startServer, Browser, agendaForm } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');

test('halaman agenda punya preview Open Graph tanpa data peserta', async () => {
  const server = await startServer({ config: { publicUrl: 'https://lq.example' } });
  try {
    const owner = new Browser(server.baseUrl);
    const created = await owner.post('/agenda', agendaForm({
      title: 'Mabar "Sabtu" <b>', description: 'Rahasia: kode room 1234',
    }));
    const agendaPath = created.headers.get('location').split('?')[0];
    const page = await owner.get(agendaPath);
    const optionId = /name="option" value="(\d+)"/.exec(page.text)[1];
    await new Browser(server.baseUrl).post(`${agendaPath}/suara`, [['name', 'NamaPesertaUnik'], ['option', optionId]]);

    const { text } = await new Browser(server.baseUrl).get(agendaPath);
    const meta = [...text.matchAll(/<meta (?:property|name)="(og:[^"]+|twitter:[^"]+)" content="([^"]*)">/g)]
      .map((m) => [m[1], m[2]]);
    const og = Object.fromEntries(meta);
    assert.equal(og['og:title'], 'Mabar &#34;Sabtu&#34; &lt;b&gt;');
    assert.equal(og['og:image'], 'https://lq.example/og-image.png');
    assert.match(og['og:url'], /^https:\/\/lq\.example\/a\/[A-Za-z0-9_-]{16}$/);
    assert.match(og['og:description'], /2 pilihan waktu/);
    const all = meta.map(([, v]) => v).join(' ');
    assert.doesNotMatch(all, /Rahasia|NamaPesertaUnik/);
  } finally {
    await server.close();
  }
});

test('gambar preview tersedia sebagai PNG', async () => {
  const server = await startServer();
  try {
    const response = await fetch(`${server.baseUrl}/og-image.png`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
  } finally {
    await server.close();
  }
});
