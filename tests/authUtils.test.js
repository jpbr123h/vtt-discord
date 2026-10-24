import test from 'node:test';
import assert from 'node:assert/strict';
import { getAuthErrorMessage, isFirebaseConfigComplete } from '../src/auth/authUtils.js';

test('requer os campos essenciais da configuração Web do Firebase', () => {
  const config = {
    apiKey: 'api-key',
    authDomain: 'vtt.firebaseapp.com',
    projectId: 'vtt',
    appId: 'app-id',
  };

  assert.equal(isFirebaseConfigComplete(config), true);
  assert.equal(isFirebaseConfigComplete({ ...config, projectId: '' }), false);
  assert.equal(isFirebaseConfigComplete({ ...config, apiKey: '   ' }), false);
});

test('retorna falso para configuração ausente ou incompleta', () => {
  assert.equal(isFirebaseConfigComplete(undefined), false);
  assert.equal(isFirebaseConfigComplete({}), false);
});

test('converte erros comuns de autenticação em mensagens para o usuário', () => {
  assert.match(getAuthErrorMessage('auth/internal-error'), /Authentication ainda não está configurado/);
  assert.match(getAuthErrorMessage('auth/configuration-not-found'), /E-mail\/senha/);
  assert.equal(getAuthErrorMessage('auth/email-already-in-use'), 'Este e-mail já possui uma conta.');
  assert.equal(getAuthErrorMessage('auth/invalid-credential'), 'E-mail ou senha incorretos.');
  assert.equal(getAuthErrorMessage('auth/weak-password'), 'A senha precisa ter pelo menos 6 caracteres.');
});

test('usa mensagem genérica para códigos de erro desconhecidos', () => {
  assert.equal(
    getAuthErrorMessage('auth/unexpected-error'),
    'Não foi possível concluir. Verifique a configuração do Firebase e tente novamente.'
  );
});
