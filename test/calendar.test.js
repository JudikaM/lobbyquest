const { startServer, Browser, agendaForm } = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeText, fold, buildIcs, googleCalendarUrl } = require('../src/calendar');

test('escapeText mengikuti RFC 5545', () => {
  assert.equal(escapeText('a,b;c\\d\ne'), 'a\\,b\;c\\\\d\\ne');
});

test('fold memotong baris di 75 oktet tanpa merusak UTF-8', () => {
  const line = `SUMMARY:${'🎮'.repeat(40)}`;
  const folded = fold(line);
  for (const part of folded.split('\r\n')) {
    assert.ok(Buffer.byteLength(part) <= 75, part);
  }
  assert.equal(folded.replace(/\r\n /g, ''), line);
});

test('buildIcs menghasilkan VEVENT yang valid', () => {
  const ics = buildIcs({
    slug: 'AAAAAAAAAAAAAAAA',
    title: 'Mabar, ranked; malam',
    description: 'Baris 1\nBaris 2',
    location: 'Discord',
    url: 'https://lq.example/a/AAAAAAAAAAAAAAAA',
    startsAt: '2026-11-07T12:00:00.000Z',
    endsAt: '2026-11-07T15:00:00.000Z',
    now: new Date('2026-11-05T00:00:00Z'),
  });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /\r\nDTSTART:20261107T120000Z\r\n/);
  assert.match(ics, /\r\nDTEND:20261107T150000Z\r\n/);
  assert.match(ics, /\r\nSUMMARY:Mabar\\, ranked\; malam\r\n/);
  assert.match(ics, /\r\nEND:VCALENDAR\r\n$/);
  assert.doesNotMatch(ics, /UID:.*AAAAAAAAAAAAAAAA/, 'UID tidak memuat slug');
  assert.doesNotMatch(ics.replace(/\r\n/g, ''), /\n/, 'tidak ada LF tanpa CR');
});

test('googleCalendarUrl meng-encode parameter', () => {
  const url = new URL(googleCalendarUrl({
    title: 'Mabar & nongkrong', description: null, location: null, url: 'https://lq.example/a/x',
    startsAt: '2026-11-07T12:00:00.000Z', endsAt: '2026-11-07T15:00:00.000Z',
  }));
  assert.equal(url.hostname, 'calendar.google.com');
  assert.equal(url.searchParams.get('text'), 'Mabar & nongkrong');
  assert.equal(url.searchParams.get('dates'), '20261107T120000Z/20261107T150000Z');
});

test('file .ics hanya tersedia setelah waktu final ditetapkan', async () => {
  const server = await startServer();
  try {
    const owner = new Browser(server.baseUrl);
    const created = await owner.post('/agenda', agendaForm({ title: 'Mabar\nInjeksi: X' }));
    const agendaPath = created.headers.get('location').split('?')[0];
    assert.equal((await owner.get(`${agendaPath}/kalender.ics`)).status, 404);

    const page = await owner.get(agendaPath);
    const optionId = /name="option" value="(\d+)"/.exec(page.text)[1];
    await owner.post(`${agendaPath}/tetapkan`, [['option', optionId]]);
    assert.match((await owner.get(agendaPath)).text, /kalender\.ics/);

    const response = await new Browser(server.baseUrl).get(`${agendaPath}/kalender.ics`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/calendar/);
    assert.match(response.headers.get('content-disposition'), /^attachment;/);
    // Baris baru di judul sudah dibersihkan, jadi tidak bisa menyisipkan properti.
    assert.doesNotMatch(response.text, /\r\nInjeksi/);
  } finally {
    await server.close();
  }
});
