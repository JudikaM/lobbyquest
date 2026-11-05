require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { localToUtc, utcToLocalInput, formatRange } = require('../src/time');

test('localToUtc mengonversi jam WIB, WITA, dan WIT ke UTC', () => {
  assert.equal(localToUtc('2026-12-01T19:00', 'Asia/Jakarta').toISOString(), '2026-12-01T12:00:00.000Z');
  assert.equal(localToUtc('2026-12-01T19:00', 'Asia/Makassar').toISOString(), '2026-12-01T11:00:00.000Z');
  assert.equal(localToUtc('2026-12-01T19:00', 'Asia/Jayapura').toISOString(), '2026-12-01T10:00:00.000Z');
});

test('localToUtc menolak format dan tanggal yang tidak valid', () => {
  for (const value of ['', '2026-02-30T10:00', '2026-12-01T24:00', '2026-12-01 10:00', '01-12-2026T10:00', 'x']) {
    assert.equal(localToUtc(value, 'Asia/Jakarta'), null, value);
  }
});

test('utcToLocalInput membulatkan ke menit berikutnya', () => {
  const value = utcToLocalInput(new Date('2026-12-01T12:00:30Z'), 'Asia/Jakarta');
  assert.equal(value, '2026-12-01T19:01');
});

test('formatRange menulis rentang pada hari yang sama secara ringkas', () => {
  const text = formatRange('2026-11-01T12:00:00.000Z', '2026-11-01T15:00:00.000Z', 'Asia/Jakarta');
  assert.match(text, /Minggu, 1 November 2026, 19\.00–22\.00 WIB/);
});

test('dateParts menyiapkan komponen petak tanggal', () => {
  const { dateParts } = require('../src/time');
  const parts = dateParts('2026-11-07T12:00:00.000Z', '2026-11-07T15:00:00.000Z', 'Asia/Jakarta');
  assert.equal(parts.weekday, 'Sab');
  assert.equal(parts.day, '7');
  assert.equal(parts.month, 'Nov');
  assert.equal(parts.range, '19.00–22.00');
  assert.equal(parts.date, 'Sabtu, 7 November 2026');
  assert.equal(parts.zone, 'WIB');
  const late = dateParts('2026-11-07T16:00:00.000Z', '2026-11-07T18:00:00.000Z', 'Asia/Jakarta');
  assert.equal(late.crossesDay, true);
  assert.match(late.date, /Sabtu, 7 November 2026 – Minggu, 8 November/);
});
