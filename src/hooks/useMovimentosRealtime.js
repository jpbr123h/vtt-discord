import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { criarFilaMovimentos } from '../utils/filaMovimentos.js';
import { salvarMovimentos } from '../services/mesa.js';

function posicao(item, colecao) {
  return colecao === 'anotacoes' && item.tipo === 'traco'
    ? { offsetX: item.offsetX || 0, offsetY: item.offsetY || 0 }
    : { x: item.x, y: item.y };
}

export default function useMovimentosRealtime(sessaoId) {
  const locais = useRef(new Map());
  const [erro, setErro] = useState('');
  const fila = useMemo(() => criarFilaMovimentos(async (lote) => {
    if (!sessaoId) return true;
    const salvo = await salvarMovimentos(sessaoId, lote);
    if (!salvo) setErro('Não foi possível transmitir o movimento. Verifique sua conexão e permissões.');
    return salvo;
  }), [sessaoId]);

  useEffect(() => () => fila.cancelar(), [fila]);

  const transmitir = useCallback((tokens = [], anotacoes = []) => {
    const lote = [];
    for (const [colecao, itens] of [['tokens', tokens], ['anotacoes', anotacoes]]) {
      itens.forEach((item) => {
        const dados = posicao(item, colecao);
        locais.current.set(`${colecao}:${item.id}`, dados);
        lote.push({ colecao, id: item.id, dados });
      });
    }
    fila.adicionar(lote);
  }, [fila]);

  const concluir = useCallback(async (tokens = [], anotacoes = []) => {
    setErro('');
    transmitir(tokens, anotacoes);
    const versoes = new Map(locais.current);
    const salvo = await fila.finalizar();
    for (const [colecao, itens] of [['tokens', tokens], ['anotacoes', anotacoes]]) {
      itens.forEach(({ id }) => {
        const chave = `${colecao}:${id}`;
        if (locais.current.get(chave) === versoes.get(chave)) locais.current.delete(chave);
      });
    }
    if (!salvo) setErro('Não foi possível salvar a posição final. Verifique sua conexão e permissões.');
  }, [fila, transmitir]);

  const receber = useCallback((colecao, itens) => itens.map((item) => {
    const local = locais.current.get(`${colecao}:${item.id}`);
    return local ? { ...item, ...local } : item;
  }), []);

  const cancelar = useCallback(() => {
    fila.cancelar();
    locais.current.clear();
  }, [fila]);

  return { transmitir, concluir, receber, cancelar, erro };
}
