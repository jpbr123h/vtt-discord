const AUTH_ERROR_MESSAGES = {
  'auth/configuration-not-found': 'Ative o Firebase Authentication e o método E-mail/senha no Console do Firebase.',
  'auth/internal-error': 'O Firebase Authentication ainda não está configurado para este projeto. No Console, abra Authentication, clique em Começar e habilite E-mail/senha em Método de login.',
  'auth/email-already-in-use': 'Este e-mail já possui uma conta.',
  'auth/invalid-email': 'Informe um e-mail válido.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
};

export function isFirebaseConfigComplete(config) {
  return ['apiKey', 'authDomain', 'projectId', 'appId'].every((key) => (
    typeof config?.[key] === 'string' && config[key].trim().length > 0
  ));
}

export function getAuthErrorMessage(code) {
  return AUTH_ERROR_MESSAGES[code] || 'Não foi possível concluir. Verifique a configuração do Firebase e tente novamente.';
}
