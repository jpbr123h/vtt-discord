import test from 'node:test';
import assert from 'node:assert/strict';
import { obterPermissoes, podeEditarAnotacao } from '../src/utils/permissoes.js';

test('sem vínculo com a sessão, não há acesso nem ações', () => {
  assert.deepEqual(obterPermissoes(null), { podeVerMapa: false, podeMover: false, podeAnotar: false, podeAdicionar: false });
});

test('jogadores antigos mantêm visualização, sem receber permissão de anotar', () => {
  assert.deepEqual(obterPermissoes({ podeMover: true, podeAdicionar: true }),
    { podeVerMapa: true, podeMover: true, podeAnotar: false, podeAdicionar: true });
});

test('bloquear o mapa desabilita todas as ações sem apagar as configurações do membro', () => {
  const membro = { podeVerMapa: false, podeMover: true, podeAnotar: true, podeAdicionar: true };
  assert.deepEqual(obterPermissoes(membro), obterPermissoes(null));
  assert.equal(obterPermissoes({ ...membro, podeVerMapa: true }).podeAnotar, true);
});

test('mover tokens e criar anotações são permissões independentes', () => {
  assert.equal(obterPermissoes({ podeMover: true }).podeAnotar, false);
  assert.equal(obterPermissoes({ podeAnotar: true }).podeMover, false);
  assert.equal(obterPermissoes({ podeMover: 'true' }).podeMover, false);
});

test('jogadores só editam as próprias anotações quando autorizados', () => {
  const permitido = obterPermissoes({ podeAnotar: true });
  assert.equal(podeEditarAnotacao(permitido, { autorId: 'a' }, 'a'), true);
  assert.equal(podeEditarAnotacao(permitido, { autorId: 'mestre' }, 'a'), false);
  assert.equal(podeEditarAnotacao(permitido, {}, 'a'), false);
  assert.equal(podeEditarAnotacao(obterPermissoes({ podeMover: true }), { autorId: 'a' }, 'a'), false);
  assert.equal(podeEditarAnotacao(obterPermissoes({ podeAnotar: true, podeVerMapa: false }), { autorId: 'a' }, 'a'), false);
});
