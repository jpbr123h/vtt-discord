import test from 'node:test';
import assert from 'node:assert/strict';
import { obterPermissoes, podeEditarAnotacao } from '../src/utils/permissoes.js';
import { obterAreaClima, removerAreasClimaCobertas } from '../src/utils/clima.js';
import { criarFilaMovimentos } from '../src/utils/filaMovimentos.js';
import { calcularAreasNevoa, clarearCelula, cobrirCelula, opacidadeDaCelula } from '../src/utils/nevoa.js';
import { lerConteudoColado } from '../src/utils/clipboard.js';

for (let mask = 0; mask < 16; mask++) {
  const membro = { podeVerMapa: Boolean(mask & 1), podeMover: Boolean(mask & 2), podeAnotar: Boolean(mask & 4), podeAdicionar: Boolean(mask & 8) };
  test(`matriz de permissões ${mask.toString(2).padStart(4, '0')}: visualizar controla ações; autoria controla edição`, () => {
    const p = obterPermissoes(membro);
    assert.equal(p.podeVerMapa, membro.podeVerMapa);
    for (const campo of ['podeMover', 'podeAnotar', 'podeAdicionar']) assert.equal(p[campo], membro.podeVerMapa && membro[campo]);
    assert.equal(podeEditarAnotacao(p, { autorId: 'eu' }, 'eu'), p.podeAnotar);
    assert.equal(podeEditarAnotacao(p, { autorId: 'outro' }, 'eu'), false);
  });
}

test('100 retângulos de clima são simétricos, limitados ao mapa e mantêm dimensões positivas', () => {
  let seed = 9327;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const mapa = { largura: 1024, altura: 768 };
  for (let i = 0; i < 100; i++) {
    const a = { x: random() * 1400 - 150, y: random() * 1000 - 100 };
    const b = { x: random() * 1400 - 150, y: random() * 1000 - 100 };
    const area = obterAreaClima(a, b, mapa);
    assert.deepEqual(area, obterAreaClima(b, a, mapa));
    if (area) {
      assert.ok(area.x >= 0 && area.y >= 0 && area.largura >= 12 && area.altura >= 12);
      assert.ok(area.x + area.largura <= mapa.largura && area.y + area.altura <= mapa.altura);
    }
  }
});

test('limpeza de climas é idempotente e não deixa duas áreas equivalentes', () => {
  const areas = Array.from({ length: 24 }, (_, i) => ({ id: `${i}`, clima: i % 2 ? 'chuva' : 'lava', intensidade: (i % 3) + 1, x: 10, y: 20, largura: 200, altura: 150 }));
  const resultado = removerAreasClimaCobertas(areas);
  assert.equal(resultado.length, 2);
  assert.deepEqual(removerAreasClimaCobertas(resultado), resultado);
  assert.deepEqual(areas.map((a) => a.id), Array.from({ length: 24 }, (_, i) => `${i}`), 'não altera a lista original');
});

test('névoa calculada respeita mapas que não são múltiplos de 50', () => {
  const areas = calcularAreasNevoa({ largura: 127, altura: 83, celulas: {} });
  assert.equal(areas.reduce((s, a) => s + a.width * a.height, 0), 127 * 83);
  for (const a of areas) {
    assert.ok(a.x + a.width <= 127 && a.y + a.height <= 83);
    assert.ok(a.width > 0 && a.height > 0);
  }
});

test('clarear e recobrir 20 vezes nunca deixa opacidade fora de 0–1 nem modifica o original', () => {
  const original = {}; let atual = original;
  for (let i = 0; i < 20; i++) atual = clarearCelula(atual, 1, 1);
  assert.equal(opacidadeDaCelula(atual, 1, 1), 0);
  for (let i = 0; i < 20; i++) atual = cobrirCelula(atual, 1, 1);
  assert.equal(opacidadeDaCelula(atual, 1, 1), 1);
  assert.deepEqual(atual, {}); assert.deepEqual(original, {});
});

test('clipboard com arquivo nulo recua para o texto disponível', () => {
  assert.deepEqual(lerConteudoColado({ items: [{ kind: 'file', type: 'image/png', getAsFile: () => null }], getData: () => 'Alternativa' }), { tipo: 'texto', texto: 'Alternativa' });
});

test('fila se recupera de erro de rede e transmite a nova posição', async () => {
  const lotes = []; let falhar = true;
  const fila = criarFilaMovimentos(async (lote) => { lotes.push(lote); if (falhar) { falhar = false; throw new Error('rede'); } return true; });
  fila.adicionar([{ colecao: 'tokens', id: 'a', dados: { x: 10, y: 10 } }]);
  await assert.rejects(fila.finalizar(), /rede/);
  fila.adicionar([{ colecao: 'tokens', id: 'a', dados: { x: 50, y: 60 } }]);
  assert.equal(await fila.finalizar(), true); assert.equal(lotes[1][0].dados.x, 50);
});

test('cancelar enquanto há envio em andamento elimina apenas a posição ainda pendente', async () => {
  let liberar; const lotes = [];
  const fila = criarFilaMovimentos(async (lote) => { lotes.push(lote); await new Promise((resolve) => { liberar = resolve; }); return true; });
  fila.adicionar([{ colecao: 'tokens', id: 'a', dados: { x: 1, y: 1 } }]);
  const envio = fila.finalizar(); await Promise.resolve();
  fila.adicionar([{ colecao: 'tokens', id: 'a', dados: { x: 100, y: 100 } }]);
  fila.cancelar(); liberar(); await envio; await fila.finalizar();
  assert.equal(lotes.length, 1); assert.equal(lotes[0][0].dados.x, 1);
});
