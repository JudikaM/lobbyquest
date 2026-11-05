require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { initial, avatarClass } = require('../src/presenters');

test('initial mengambil huruf atau emoji pertama', () => {
  assert.equal(initial('budi'), 'B');
  assert.equal(initial('  ani'), 'A');
  assert.equal(initial('🎮 Gamer'), '🎮');
  assert.equal(initial('👩‍💻 Dev'), '👩‍💻');
});

test('avatarClass memilih warna tetap dari ID peserta', () => {
  assert.equal(avatarClass(9), 'avatar-1');
  assert.equal(avatarClass(0), 'avatar-0');
});

test('widthClass dan growClass menghasilkan kelas yang ada di CSS', () => {
  const { widthClass, growClass } = require('../src/presenters');
  assert.equal(widthClass(0, 5), 'w-0');
  assert.equal(widthClass(1, 100), 'w-2');
  assert.equal(widthClass(5, 6), 'w-84');
  assert.equal(widthClass(9, 6), 'w-100');
  assert.equal(growClass(3), 'g-3');
  assert.equal(growClass(99), 'g-50');
  assert.equal(growClass(-1), 'g-0');
});
