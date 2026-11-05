require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanText } = require('../src/text');
const { validateVote } = require('../src/votes');

test('cleanText membuang karakter kontrol dan bidi override', () => {
  assert.equal(cleanText('Bu\u0000di‮'), 'Budi');
  assert.equal(cleanText('⁦admin⁩'), 'admin');
  assert.equal(cleanText('a\u0007b'), 'ab');
});

test('cleanText satu baris merapatkan spasi dan baris baru', () => {
  assert.equal(cleanText('  Mabar \n\t ranked  '), 'Mabar ranked');
});

test('cleanText multi-baris mempertahankan paragraf', () => {
  assert.equal(cleanText('Baris 1\r\n\r\n\r\n\r\nBaris 2  \n  lanjut', { multiline: true }), 'Baris 1\n\nBaris 2\nlanjut');
});

test('cleanText menormalkan Unicode dan menolak bukan string', () => {
  assert.equal(cleanText('é'), 'é');
  assert.equal(cleanText(['x']), '');
  assert.equal(cleanText({ toString: () => 'x' }), '');
  assert.equal(cleanText(undefined), '');
});

test('nama yang hanya berisi karakter tak terlihat ditolak', () => {
  const agenda = { timeOptions: [] };
  assert.ok(validateVote({ name: '‮\u0000 ' }, agenda).errors.length);
  assert.deepEqual(validateVote({ name: 'Ani 🎮' }, agenda).errors, []);
});
