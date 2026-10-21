import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNumericInput } from '../src/utils/numericInput.js';

test('mantém somente os dígitos digitados', () => {
  assert.equal(normalizeNumericInput('12a3'), 123);
  assert.equal(normalizeNumericInput('1.5'), 15);
  assert.equal(normalizeNumericInput(''), '');
});

test('aplica o mínimo configurado sem impedir valores válidos', () => {
  assert.equal(normalizeNumericInput('0', 1), 1);
  assert.equal(normalizeNumericInput('4', 1), 4);
});

test('trata entradas não textuais como texto', () => {
  assert.equal(normalizeNumericInput(null), '');
  assert.equal(normalizeNumericInput(42), 42);
});
