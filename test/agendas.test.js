require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAgenda, LIMITS, MAX_SLOTS } = require('../src/agendas');

const NOW = new Date('2026-11-05T00:00:00Z');

function body(overrides = {}) {
  return {
    title: 'Nongkrong Jumat',
    kind: 'nongkrong',
    description: '',
    location: '',
    timezone: 'Asia/Jakarta',
    start: ['2026-11-10T19:00', '2026-11-11T19:00'],
    end: ['2026-11-10T21:00', '2026-11-11T21:00'],
    ...overrides,
  };
}

test('agenda valid menghasilkan data siap simpan dalam UTC', () => {
  const { errors, agenda } = validateAgenda(body(), NOW);
  assert.deepEqual(errors, []);
  assert.equal(agenda.slots.length, 2);
  assert.equal(agenda.slots[0].startsAt, '2026-11-10T12:00:00.000Z');
});

test('judul terlalu pendek atau terlalu panjang ditolak', () => {
  assert.ok(validateAgenda(body({ title: 'ab' }), NOW).errors.length);
  assert.ok(validateAgenda(body({ title: 'x'.repeat(LIMITS.title + 1) }), NOW).errors.length);
});

test('jenis dan zona waktu hanya dari daftar yang dikenal', () => {
  assert.ok(validateAgenda(body({ kind: 'constructor' }), NOW).errors.length);
  assert.ok(validateAgenda(body({ timezone: 'Europe/Paris' }), NOW).errors.length);
  assert.ok(validateAgenda(body({ timezone: 'toString' }), NOW).errors.length);
});

test('pilihan waktu di masa lalu, terbalik, atau kembar ditolak', () => {
  assert.ok(validateAgenda(body({ start: ['2026-11-01T19:00', '2026-11-11T19:00'] }), NOW).errors.length);
  assert.ok(validateAgenda(body({ end: ['2026-11-10T18:00', '2026-11-11T21:00'] }), NOW).errors.length);
  assert.ok(validateAgenda(body({
    start: ['2026-11-10T19:00', '2026-11-10T19:00'],
    end: ['2026-11-10T21:00', '2026-11-10T21:00'],
  }), NOW).errors.length);
});

test('jumlah pilihan waktu dibatasi', () => {
  assert.ok(validateAgenda(body({ start: '2026-11-10T19:00', end: '2026-11-10T21:00' }), NOW).errors.length);
  const many = Array.from({ length: MAX_SLOTS + 1 }, (_, i) => `2026-11-${String(10 + i).padStart(2, '0')}T19:00`);
  const ends = many.map((value) => value.replace('T19', 'T21'));
  assert.ok(validateAgenda(body({ start: many, end: ends }), NOW).errors.length);
});

test('field bukan string tidak membuat validasi error', () => {
  const { errors } = validateAgenda(body({ title: ['a', 'b'], description: { x: 1 } }), NOW);
  assert.ok(errors.length);
});
