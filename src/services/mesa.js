import { deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../auth/firebase.js';

// Camada única de persistência da mesa.
// Toda escrita em tokens/anotações passa por aqui para evitar que uma ação
// fique só no estado local (o que causava itens "voltando" após um snapshot).

const LIMITE_LOTE = 500;

function semId(objeto) {
  if (!objeto) return objeto;
  const { id: _ignorado, ...dados } = objeto;
  return dados;
}

function referencia(colecao, sessaoId, id) {
  if (!db || !sessaoId || !id) return null;
  return doc(db, 'sessoes', sessaoId, colecao, id);
}

function registrarErro(acao, erro) {
  console.error(`Erro ao ${acao}:`, erro);
}

export async function salvarToken(sessaoId, token) {
  const alvo = referencia('tokens', sessaoId, token?.id);
  if (!alvo) return false;
  try {
    await setDoc(alvo, semId(token), { merge: true });
    return true;
  } catch (erro) {
    registrarErro('salvar token', erro);
    return false;
  }
}

export async function salvarTokens(sessaoId, tokens = []) {
  const validos = tokens.filter((token) => token?.id);
  if (!db || !sessaoId || validos.length === 0) return false;
  try {
    const lotes = [];
    for (let i = 0; i < validos.length; i += LIMITE_LOTE) {
      const lote = writeBatch(db);
      validos.slice(i, i + LIMITE_LOTE).forEach((token) => lote.set(referencia('tokens', sessaoId, token.id), semId(token), { merge: true }));
      lotes.push(lote.commit());
    }
    await Promise.all(lotes);
    return true;
  } catch (erro) {
    registrarErro('salvar tokens', erro);
    return false;
  }
}

export async function excluirToken(sessaoId, tokenId) {
  const alvo = referencia('tokens', sessaoId, tokenId);
  if (!alvo) return false;
  try {
    await deleteDoc(alvo);
    return true;
  } catch (erro) {
    registrarErro('excluir token', erro);
    return false;
  }
}

export async function excluirTokens(sessaoId, ids = []) {
  const validos = ids.filter(Boolean);
  if (!db || !sessaoId || validos.length === 0) return false;
  try {
    const lotes = [];
    for (let i = 0; i < validos.length; i += LIMITE_LOTE) {
      const lote = writeBatch(db);
      validos.slice(i, i + LIMITE_LOTE).forEach((id) => lote.delete(referencia('tokens', sessaoId, id)));
      lotes.push(lote.commit());
    }
    await Promise.all(lotes);
    return true;
  } catch (erro) {
    registrarErro('excluir tokens', erro);
    return false;
  }
}

export async function salvarAnotacao(sessaoId, anotacao) {
  const alvo = referencia('anotacoes', sessaoId, anotacao?.id);
  if (!alvo) return false;
  try {
    await setDoc(alvo, semId(anotacao), { merge: true });
    return true;
  } catch (erro) {
    registrarErro('salvar anotação', erro);
    return false;
  }
}

export async function salvarAnotacoes(sessaoId, anotacoes = []) {
  const validas = anotacoes.filter((anotacao) => anotacao?.id);
  if (!db || !sessaoId || validas.length === 0) return false;
  try {
    const lotes = [];
    for (let i = 0; i < validas.length; i += LIMITE_LOTE) {
      const lote = writeBatch(db);
      validas.slice(i, i + LIMITE_LOTE).forEach((anotacao) => lote.set(referencia('anotacoes', sessaoId, anotacao.id), semId(anotacao), { merge: true }));
      lotes.push(lote.commit());
    }
    await Promise.all(lotes);
    return true;
  } catch (erro) {
    registrarErro('salvar anotações', erro);
    return false;
  }
}

export async function excluirAnotacao(sessaoId, anotacaoId) {
  const alvo = referencia('anotacoes', sessaoId, anotacaoId);
  if (!alvo) return false;
  try {
    await deleteDoc(alvo);
    return true;
  } catch (erro) {
    registrarErro('excluir anotação', erro);
    return false;
  }
}

export async function excluirAnotacoes(sessaoId, ids = []) {
  const validos = ids.filter(Boolean);
  if (!db || !sessaoId || validos.length === 0) return false;
  try {
    const lotes = [];
    for (let i = 0; i < validos.length; i += LIMITE_LOTE) {
      const lote = writeBatch(db);
      validos.slice(i, i + LIMITE_LOTE).forEach((id) => lote.delete(referencia('anotacoes', sessaoId, id)));
      lotes.push(lote.commit());
    }
    await Promise.all(lotes);
    return true;
  } catch (erro) {
    registrarErro('excluir anotações', erro);
    return false;
  }
}

// Agendamento com debounce para alterações contínuas (arrastar alças, etc.).
// A gravação final acontece em finalizarSalvar* para não perder o último valor.
const agendamentos = new Map();

function agendar(chave, gravar, atraso) {
  const anterior = agendamentos.get(chave);
  if (anterior) window.clearTimeout(anterior.timer);
  const timer = window.setTimeout(() => {
    agendamentos.delete(chave);
    gravar();
  }, atraso);
  agendamentos.set(chave, { timer, gravar });
}

function finalizar(chave) {
  const pendente = agendamentos.get(chave);
  if (!pendente) return;
  window.clearTimeout(pendente.timer);
  agendamentos.delete(chave);
  pendente.gravar();
}

export function agendarSalvarToken(sessaoId, token, atraso = 250) {
  if (!sessaoId || !token?.id) return;
  agendar(`token:${token.id}`, () => salvarToken(sessaoId, token), atraso);
}

export function finalizarSalvarToken(tokenId) {
  finalizar(`token:${tokenId}`);
}

// Névoa (fog of war): documento único em sessoes/{id}/estado/fog.
// `celulas` guarda apenas as células alteradas (chave "coluna,linha").
// Ausente = 1 (totalmente coberta); 0 = revelada, mas ainda rastreada.
// Grava o documento inteiro (sem merge) porque células cobertas de novo são
// removidas do mapa — com merge o Firestore manteria as chaves antigas.
export async function salvarNevoa(sessaoId, nevoa) {
  if (!db || !sessaoId) return false;
  try {
    await setDoc(doc(db, 'sessoes', sessaoId, 'estado', 'fog'), {
      ativo: Boolean(nevoa?.ativo),
      celulas: nevoa?.celulas || {},
      atualizadoEm: serverTimestamp(),
    });
    return true;
  } catch (erro) {
    registrarErro('salvar névoa', erro);
    return false;
  }
}

export function agendarSalvarNevoa(sessaoId, nevoa, atraso = 250) {
  if (!sessaoId) return;
  agendar(`nevoa:${sessaoId}`, () => salvarNevoa(sessaoId, nevoa), atraso);
}

export function finalizarSalvarNevoa(sessaoId) {
  finalizar(`nevoa:${sessaoId}`);
}

export function agendarSalvarAnotacao(sessaoId, anotacao, atraso = 250) {
  if (!sessaoId || !anotacao?.id) return;
  agendar(`anotacao:${anotacao.id}`, () => salvarAnotacao(sessaoId, anotacao), atraso);
}

export function finalizarSalvarAnotacao(anotacaoId) {
  finalizar(`anotacao:${anotacaoId}`);
}
