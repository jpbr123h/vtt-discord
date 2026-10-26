import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OPACIDADE_MAXIMA_NEVOA,
  calcularAreasNevoa,
  chaveCelula,
  clarearCelula,
  cobrirCelula,
  opacidadeDaCelula,
  revelarTodasAsCelulas,
} from '../src/utils/nevoa.js';

test('células ausentes começam totalmente cobertas', () => {
  assert.equal(opacidadeDaCelula({}, 0, 0), 1);
  assert.equal(opacidadeDaCelula(undefined, 3, 4), 1);
  assert.equal(opacidadeDaCelula({ [chaveCelula(3, 4)]: 0.5 }, 3, 4), 0.5);
});

test('clarear reduz a opacidade em etapas sem remover a célula', () => {
  const primeira = clarearCelula({}, 2, 1);
  assert.deepEqual(primeira, { '2,1': 0.5 });

  const segunda = clarearCelula(primeira, 2, 1);
  assert.deepEqual(segunda, { '2,1': 0 });

  const terceira = clarearCelula(segunda, 2, 1);
  assert.equal(terceira, segunda, 'já revelada, retorna a mesma referência');
});

test('cobrir de novo é apenas esquecer as células clareadas', () => {
  const celulas = clarearCelula({}, 0, 0);
  assert.equal(opacidadeDaCelula(celulas, 0, 0), 0.5);
  assert.equal(opacidadeDaCelula({}, 0, 0), 1);
});

test('cobrir devolve a névoa em etapas e remove a célula quando fica 100%', () => {
  const meio = clarearCelula({}, 1, 1);
  assert.deepEqual(meio, { '1,1': 0.5 });

  const coberta = cobrirCelula(meio, 1, 1);
  assert.deepEqual(coberta, {});
  assert.equal(opacidadeDaCelula(coberta, 1, 1), 1);
  assert.equal(cobrirCelula(coberta, 1, 1), coberta, 'já coberta, retorna a mesma referência');
});

test('cobrir leva de 0 a 0,5 e depois a 1', () => {
  const revelada = clarearCelula(clarearCelula({}, 2, 2), 2, 2);
  assert.deepEqual(revelada, { '2,2': 0 });

  const metade = cobrirCelula(revelada, 2, 2);
  assert.deepEqual(metade, { '2,2': 0.5 });

  const coberta = cobrirCelula(metade, 2, 2);
  assert.deepEqual(coberta, {});
});

test('revelar o mapa inteiro cobre todas as células do grid', () => {
  const celulas = revelarTodasAsCelulas({ largura: 120, altura: 80, tamanhoCelula: 50 });
  assert.equal(Object.keys(celulas).length, 3 * 2);
  assert.ok(Object.values(celulas).every((valor) => valor === 0));
  assert.equal(opacidadeDaCelula(celulas, 2, 1), 0);
  assert.deepEqual(revelarTodasAsCelulas({ largura: 0, altura: 0 }), {});
});

test('áreas agrupam células vizinhas de mesma opacidade', () => {
  const areas = calcularAreasNevoa({ largura: 100, altura: 50, tamanhoCelula: 50, celulas: {} });
  assert.equal(areas.length, 1);
  assert.deepEqual(areas[0], {
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    opacity: OPACIDADE_MAXIMA_NEVOA,
  });
});

test('áreas quebram o bloco quando uma célula é clareada e limitam ao mapa', () => {
  const celulas = { '1,0': 0.5 };
  const areas = calcularAreasNevoa({ largura: 100, altura: 50, tamanhoCelula: 50, celulas });
  assert.deepEqual(areas, [
    { x: 0, y: 0, width: 50, height: 50, opacity: OPACIDADE_MAXIMA_NEVOA },
    { x: 50, y: 0, width: 50, height: 50, opacity: 0.5 * OPACIDADE_MAXIMA_NEVOA },
  ]);

  const parcial = calcularAreasNevoa({ largura: 120, altura: 80, tamanhoCelula: 50, celulas: {} });
  const ultimaLinha = parcial.filter((area) => area.y === 50);
  assert.ok(ultimaLinha.every((area) => area.height === 30));
  assert.ok(parcial.every((area) => area.x + area.width <= 120));
});
