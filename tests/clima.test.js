import test from 'node:test';
import assert from 'node:assert/strict';
import { obterAreaClima, areaClimaValida, removerAreasClimaCobertas } from '../src/utils/clima.js';

const mapa = { largura: 1000, altura: 800 };

test('a área de clima é igual ao desenhar nos dois sentidos', () => {
  const a = { x: 100, y: 150 };
  const b = { x: 400, y: 450 };
  assert.deepEqual(obterAreaClima(a, b, mapa), { x: 100, y: 150, largura: 300, altura: 300 });
  assert.deepEqual(obterAreaClima(b, a, mapa), obterAreaClima(a, b, mapa));
});

test('recorta a seleção nos limites do mapa e ignora cliques sem arrastar', () => {
  assert.deepEqual(obterAreaClima({ x: -50, y: -20 }, { x: 1200, y: 900 }, mapa),
    { x: 0, y: 0, largura: 1000, altura: 800 });
  assert.equal(obterAreaClima({ x: 10, y: 10 }, { x: 15, y: 15 }, mapa), null);
  assert.equal(obterAreaClima({ x: 1200, y: 100 }, { x: 1300, y: 400 }, mapa), null);
});

test('dados de clima inválidos não chegam ao canvas animado', () => {
  const area = { clima: 'chuva', intensidade: 2, x: 0, y: 0, largura: 300, altura: 200 };
  assert.ok(areaClimaValida(area));
  for (const clima of ['sol', 'inverno', 'lava']) assert.ok(areaClimaValida({ ...area, clima }));
  assert.ok(!areaClimaValida({ ...area, intensidade: 0 }));
  assert.ok(!areaClimaValida({ ...area, clima: 'invalido' }));
  assert.ok(!areaClimaValida({ ...area, largura: NaN }));
  assert.ok(!areaClimaValida({ ...area, altura: -1 }));
});

const maior = { id: 'maior', clima: 'chuva', intensidade: 1, x: 10, y: 10, largura: 200, altura: 200 };
const menor = { id: 'menor', clima: 'chuva', intensidade: 3, x: 40, y: 40, largura: 50, altura: 50 };

test('clima maior elimina os menores contidos, independentemente da intensidade e da ordem', () => {
  assert.deepEqual(removerAreasClimaCobertas([menor, maior]), [maior]);
  assert.deepEqual(removerAreasClimaCobertas([maior, menor]), [maior]);
  const outroMenor = { ...menor, id: 'outro', x: 120 };
  assert.deepEqual(removerAreasClimaCobertas([menor, outroMenor, maior]), [maior]);
});

test('sobreposição parcial, bordas encostadas e climas diferentes são preservados', () => {
  const parcial = { ...menor, x: 190 };
  const encostado = { ...menor, x: 210 };
  const sol = { ...menor, clima: 'sol' };
  const areas = [maior, parcial, encostado, sol];
  assert.deepEqual(removerAreasClimaCobertas(areas), areas);
});

test('área contida pode compartilhar bordas com a maior', () => {
  assert.deepEqual(removerAreasClimaCobertas([maior, { ...menor, x: 10, y: 10 }]), [maior]);
});

test('áreas idênticas conservam só a mais recente e sua intensidade', () => {
  const recente = { ...maior, id: 'recente', intensidade: 3 };
  assert.deepEqual(removerAreasClimaCobertas([maior, recente]), [recente]);
  assert.deepEqual(removerAreasClimaCobertas([recente, maior]), [maior]);
});

test('limpa redundâncias existentes e conserva a maior em cadeias de áreas contidas', () => {
  const gigante = { ...maior, id: 'gigante', x: 0, y: 0, largura: 500, altura: 500 };
  const areas = removerAreasClimaCobertas([maior, menor, gigante]);
  assert.deepEqual(areas, [gigante]);
  assert.deepEqual(removerAreasClimaCobertas(areas), areas);
  assert.deepEqual(removerAreasClimaCobertas([]), []);
});


test('lava usa as três intensidades e substitui apenas lava totalmente coberta', () => {
  for (const intensidade of [1, 2, 3]) assert.ok(areaClimaValida({ ...maior, clima: 'lava', intensidade }));
  const lavaMaior = { ...maior, clima: 'lava' };
  const lavaMenor = { ...menor, clima: 'lava' };
  assert.deepEqual(removerAreasClimaCobertas([lavaMenor, menor, lavaMaior]), [menor, lavaMaior]);
});
