export const OPCOES_PERMISSAO = [
  { chave: 'podeVerMapa', titulo: 'Ver mapa', descricao: 'Acessar o mapa, os tokens e as anotações da mesa.' },
  { chave: 'podeMover', titulo: 'Mover tokens', descricao: 'Arrastar tokens nas áreas reveladas do mapa.' },
  { chave: 'podeAnotar', titulo: 'Escrever e desenhar', descricao: 'Criar textos e traços, colar imagens e editar as próprias anotações.' },
  { chave: 'podeAdicionar', titulo: 'Adicionar tokens', descricao: 'Colocar personagens nas áreas reveladas do mapa.' },
];

export function obterPermissoes(membro) {
  if (!membro) return { podeVerMapa: false, podeMover: false, podeAnotar: false, podeAdicionar: false };
  // Jogadores antigos já visualizavam o mapa antes deste controle existir.
  const podeVerMapa = membro.podeVerMapa !== false;
  return {
    podeVerMapa,
    podeMover: podeVerMapa && membro.podeMover === true,
    podeAnotar: podeVerMapa && membro.podeAnotar === true,
    podeAdicionar: podeVerMapa && membro.podeAdicionar === true,
  };
}

export function podeEditarAnotacao(permissoes, anotacao, usuarioId) {
  return Boolean(permissoes.podeVerMapa && permissoes.podeAnotar && usuarioId && anotacao?.autorId === usuarioId);
}
