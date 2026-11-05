require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { initial, avatarClass, fillClass } = require('../src/presenters');

test('initial mengambil huruf atau emoji pertama', () => {
  assert.equal(initial('budi'), 'B');
  assert.equal(initial('  ani'), 'A');
  assert.equal(initial('🎮 Gamer'), '🎮');
  assert.equal(initial('👩‍💻 Dev'), '👩‍💻');
});

test('avatarClass dan fillClass menghasilkan class tetap', () => {
  assert.equal(avatarClass(9), 'avatar-1');
  assert.equal(fillClass(0, 0), 'fill-0');
  assert.equal(fillClass(1, 3), 'fill-3');
  assert.equal(fillClass(3, 3), 'fill-10');
  assert.equal(fillClass(5, 3), 'fill-10');
});
