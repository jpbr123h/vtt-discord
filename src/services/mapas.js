import { collection, doc, getDoc, getDocs, query, where, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../auth/firebase.js';
import { novoId } from '../utils/id.js';

const TAMANHO_PARTE = 700_000;
const LIMITE_IMAGEM = 2_800_000;

async function comprimirMapa(arquivo) {
  if (arquivo.size > 30 * 1024 * 1024) throw new Error('Escolha uma imagem de até 30 MB.');
  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = new Image();
    imagem.src = url;
    await imagem.decode();
    const canvas = document.createElement('canvas');
    let escala = Math.min(1, 4096 / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
      canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
      const contexto = canvas.getContext('2d');
      contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
      const dados = canvas.toDataURL('image/webp', 0.85);
      if (dados.length <= LIMITE_IMAGEM) return dados;
      escala *= 0.75;
    }
    throw new Error('A imagem é grande demais. Reduza a resolução e tente novamente.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function salvarMapa(sessaoId, arquivo) {
  if (!db || !sessaoId) throw new Error('Selecione uma campanha para salvar o mapa.');
  const dados = await comprimirMapa(arquivo);
  const referenciaMapa = doc(db, 'sessoes', sessaoId, 'estado', 'mapa');
  const anterior = await getDoc(referenciaMapa);
  const id = novoId();
  const partes = collection(db, 'sessoes', sessaoId, 'estado');
  const lote = writeBatch(db);
  for (let inicio = 0, ordem = 0; inicio < dados.length; inicio += TAMANHO_PARTE, ordem++) {
    lote.set(doc(partes, `mapa-imagem-${id}-${ordem}`), { imagemId: id, ordem, dados: dados.slice(inicio, inicio + TAMANHO_PARTE) });
  }
  const url = `firestore-map:${sessaoId}:${id}`;
  lote.set(referenciaMapa, {
    url,
    atualizadoEm: serverTimestamp(),
  }, { merge: true });
  await lote.commit();
  const urlAnterior = anterior.data()?.url;
  if (urlAnterior?.startsWith('firestore-map:')) {
    try {
      const idAnterior = urlAnterior.split(':')[2];
      const antigas = await getDocs(query(partes, where('imagemId', '==', idAnterior)));
      const limpeza = writeBatch(db);
      antigas.forEach((parte) => limpeza.delete(parte.ref));
      if (!antigas.empty) await limpeza.commit();
    } catch (erro) {
      console.warn('Mapa salvo, mas não foi possível remover a imagem anterior:', erro);
    }
  }
  return url;
}

export async function carregarImagemMapa(url) {
  if (!url?.startsWith('firestore-map:')) return url;
  const [, sessaoId, id] = url.split(':');
  const snap = await getDocs(query(collection(db, 'sessoes', sessaoId, 'estado'), where('imagemId', '==', id)));
  if (snap.empty) throw new Error('Imagem do mapa não encontrada.');
  return snap.docs.map((parte) => parte.data()).sort((a, b) => a.ordem - b.ordem).map((parte) => parte.dados).join('');
}
