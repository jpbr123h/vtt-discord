import test from 'node:test';
import assert from 'node:assert/strict';
import { criarFilaMovimentos } from '../src/utils/filaMovimentos.js';
const item = (x, id = 'a', colecao = 'tokens') => ({ id, colecao, dados: { x, y: 10 } });

test('envia a posição mais recente de cada item e inclui seleções mistas', async () => {
  const lotes = [];
  const fila = criarFilaMovimentos(async (lote) => { lotes.push(lote); return true; });
  fila.adicionar([item(1), item(2, 'b'), item(3, 'a', 'anotacoes')]);
  fila.adicionar([item(100)]);
  await fila.finalizar();
  assert.deepEqual(lotes, [[item(100), item(2, 'b'), item(3, 'a', 'anotacoes')]]);
});

test('rede lenta coalesce movimentos e confirma a posição final depois do envio anterior', async () => {
  const lotes = [];
  let liberar;
  const fila = criarFilaMovimentos(async (lote) => {
    lotes.push(lote);
    if (lotes.length === 1) await new Promise((resolve) => { liberar = resolve; });
    return true;
  });
  fila.adicionar([item(1)]);
  const primeiro = fila.finalizar();
  await Promise.resolve();
  for (let x = 2; x <= 50; x++) fila.adicionar([item(x)]);
  const final = fila.finalizar();
  assert.equal(lotes.length, 1);
  liberar();
  await Promise.all([primeiro, final]);
  assert.deepEqual(lotes, [[item(1)], [item(50)]]);
});

test('envia durante um arraste contínuo, sem esperar o fim nem uma pausa nos eventos', async () => {
  const lotes = [];
  let avisar;
  const transmitiu = new Promise((resolve) => { avisar = resolve; });
  const fila = criarFilaMovimentos(async (lote) => { lotes.push(lote); avisar(); return true; }, 1);
  fila.adicionar([item(1)]);
  await transmitiu;
  assert.equal(lotes.length, 1);
  fila.cancelar();
});

test('revogar a permissão cancela posições ainda não enviadas', async () => {
  const lotes = [];
  const fila = criarFilaMovimentos(async (lote) => lotes.push(lote));
  fila.adicionar([item(1)]);
  fila.cancelar();
  await fila.finalizar();
  assert.deepEqual(lotes, []);
});
