import test from 'node:test';
import assert from 'node:assert/strict';
import { lerConteudoColado, posicionarColagem } from '../src/utils/clipboard.js';

test('prioriza a imagem quando a cópia também contém texto ou HTML', () => {
  const arquivo = { type: 'image/png' };
  const dados = { items: [{ kind: 'string', type: 'text/html' }, { kind: 'file', type: 'image/png', getAsFile: () => arquivo }], getData: () => 'Texto alternativo' };
  assert.deepEqual(lerConteudoColado(dados), { tipo: 'imagem', arquivo });
});

test('suporta browsers que disponibilizam imagens apenas em files', () => {
  const arquivo = { type: 'image/jpeg' };
  assert.deepEqual(lerConteudoColado({ files: [arquivo], getData: () => '' }), { tipo: 'imagem', arquivo });
});

test('preserva o texto simples e normaliza as quebras de linha', () => {
  assert.deepEqual(lerConteudoColado({ getData: () => '  Texto\r\nSegunda linha\rTerceira  ' }),
    { tipo: 'texto', texto: '  Texto\nSegunda linha\nTerceira  ' });
});

test('ignora conteúdo vazio e arquivos que não são imagens', () => {
  assert.equal(lerConteudoColado(null), null);
  assert.equal(lerConteudoColado({ files: [{ type: 'application/pdf' }], getData: () => ' \n ' }), null);
});

test('mantém o conteúdo colado nos limites do mapa', () => {
  const mapa = { largura: 1000, altura: 800 };
  assert.deepEqual(posicionarColagem({ x: 950, y: 790 }, 300, 100, mapa), { x: 700, y: 700 });
  assert.deepEqual(posicionarColagem({ x: -20, y: -40 }, 300, 100, mapa), { x: 0, y: 0 });
  assert.deepEqual(posicionarColagem({ x: 100, y: 200 }, 300, 100, mapa), { x: 100, y: 200 });
});
