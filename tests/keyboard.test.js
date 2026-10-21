import test from 'node:test';
import assert from 'node:assert/strict';
import { isTextEditingTarget } from '../src/utils/keyboard.js';

test('reconhece campos em que atalhos de edição devem ser preservados', () => {
  for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
    assert.equal(isTextEditingTarget({ tagName }), true);
  }
  assert.equal(isTextEditingTarget({ isContentEditable: true, tagName: 'DIV' }), true);
});

test('permite atalhos do mapa fora de campos editáveis', () => {
  assert.equal(isTextEditingTarget({ tagName: 'CANVAS' }), false);
  assert.equal(isTextEditingTarget(null), false);
});
