import test from 'node:test';
import assert from 'node:assert/strict';
import { obterRelampago } from '../src/utils/relampagos.js';

test('relâmpagos aparecem exclusivamente na chuva intensa', () => {
  assert.ok(obterRelampago('chuva', 3, 3.25));
  for (const clima of ['sol', 'inverno', 'lava']) assert.equal(obterRelampago(clima, 3, 3.25), null);
  for (const nivel of [1, 2]) assert.equal(obterRelampago('chuva', nivel, 3.25), null);
});

test('clarões se repetem a cada quatro segundos e alternam os GIFs entre ciclos', () => {
  assert.equal(obterRelampago('chuva', 3, 0), null);
  assert.equal(obterRelampago('chuva', 3, 2.9), null);
  assert.equal(obterRelampago('chuva', 3, 3.5), null);
  assert.equal(obterRelampago('chuva', 3, 8), null);
  const primeiro = obterRelampago('chuva', 3, 3.25);
  const segundo = obterRelampago('chuva', 3, 7.25);
  assert.equal(primeiro.ciclo, 0);
  assert.equal(segundo.ciclo, 1);
  assert.equal(primeiro.brilho, 1);
  assert.ok(Math.abs(segundo.progresso - primeiro.progresso) < 0.00001);
});

test('movimento reduzido e tempos inválidos não produzem flashes', () => {
  assert.equal(obterRelampago('chuva', 3, 3.25, true), null);
  for (const tempo of [NaN, Infinity, -1]) assert.equal(obterRelampago('chuva', 3, tempo), null);
});

test('os dois GIFs locais têm quadros distintos e transparência compatível com o canvas', async () => {
  const { readFile } = await import('node:fs/promises');
  const { parseGIF, decompressFrames } = await import('gifuct-js');
  for (const nome of ['lightning-a.gif', 'lightning-b.gif']) {
    const bytes = await readFile(new URL(`../public/weather/${nome}`, import.meta.url));
    const gif = parseGIF(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    const quadros = decompressFrames(gif, true);
    assert.equal(quadros.length, 4);
    assert.equal(gif.lsd.width, 256);
    assert.equal(gif.lsd.height, 256);
    for (const quadro of quadros) {
      assert.deepEqual(quadro.dims, { top: 0, left: 0, width: 256, height: 256 });
      assert.equal(quadro.disposalType, 2);
      assert.ok(quadro.patch.some((valor, i) => i % 4 === 3 && valor === 0));
      assert.ok(quadro.patch.some((valor, i) => i % 4 === 3 && valor > 0));
    }
    assert.notDeepEqual(quadros[0].patch, quadros[1].patch);
  }
});
