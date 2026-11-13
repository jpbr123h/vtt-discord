import { useEffect, useRef, useState } from 'react';
import { isTextEditingTarget } from '../utils/keyboard.js';
import { lerConteudoColado, posicionarColagem, prepararImagemColada } from '../utils/clipboard.js';
import { novoId } from '../utils/id.js';

export default function useColarNoMapa(opcoes) {
  const atuais = useRef(opcoes);
  const [pendentes, setPendentes] = useState(0);
  useEffect(() => { atuais.current = opcoes; });
  useEffect(() => {
    let montado = true;
    const colar = async (evento) => {
      const inicio = atuais.current;
      if (!inicio.habilitado || inicio.bloqueado || !inicio.stageRef.current || isTextEditingTarget(evento.target) ||
        document.querySelector('[role="dialog"], .token-modal-backdrop')) return;
      const conteudo = lerConteudoColado(evento.clipboardData);
      if (!conteudo) return;
      evento.preventDefault();
      const stage = inicio.stageRef.current;
      const ponteiro = stage.getPointerPosition();
      const dentro = ponteiro && ponteiro.x >= 0 && ponteiro.y >= 0 && ponteiro.x <= stage.width() && ponteiro.y <= stage.height();
      const ponto = dentro ? stage.getRelativePointerPosition() : stage.getAbsoluteTransform().copy().invert()
        .point({ x: stage.width() / 2, y: stage.height() / 2 });
      const aindaPermitido = () => montado && atuais.current.habilitado && !atuais.current.bloqueado &&
        atuais.current.sessaoId === inicio.sessaoId;
      if (inicio.validarPosicao && !inicio.validarPosicao(ponto)) return;
      setPendentes((valor) => valor + 1);
      inicio.onErro('');
      try {
        let dados;
        if (conteudo.tipo === 'imagem') {
          const imagem = await prepararImagemColada(conteudo.arquivo);
          const escala = Math.min(1, 512 / Math.max(imagem.largura, imagem.altura),
            inicio.tamanhoPalco.largura / imagem.largura, inicio.tamanhoPalco.altura / imagem.altura);
          dados = { tipo: 'imagem', imagemUrl: imagem.imagemUrl, largura: imagem.largura * escala, altura: imagem.altura * escala };
        } else {
          if (conteudo.texto.length > 50_000) throw new Error('O texto é muito longo. Cole até 50 mil caracteres por anotação.');
          const fontSize = inicio.fontSize || 20;
          const boxWidth = Math.min(420, inicio.tamanhoPalco.largura);
          const caracteres = Math.max(1, Math.floor((boxWidth - 16) / (fontSize * 0.62)));
          const linhas = conteudo.texto.split('\n').reduce((soma, linha) => soma + Math.max(1, Math.ceil(linha.length / caracteres)), 0);
          dados = { tipo: 'texto', texto: conteudo.texto, cor: inicio.cor || '#ffcc00', fontSize,
            fontFamily: inicio.fontFamily || 'Arial, sans-serif', boxWidth,
            boxHeight: Math.min(inicio.tamanhoPalco.altura, Math.max(50, linhas * fontSize * 1.25 + 12)) };
        }
        if (!aindaPermitido()) return;
        const posicao = posicionarColagem(ponto, dados.largura || dados.boxWidth, dados.altura || dados.boxHeight, inicio.tamanhoPalco);
        if (atuais.current.validarPosicao && !atuais.current.validarPosicao(posicao)) return;
        const item = { id: novoId(), ...dados, ...posicao, ...(inicio.usuarioId ? { autorId: inicio.usuarioId } : {}) };
        await atuais.current.onColar(item, aindaPermitido);
      } catch (erro) {
        if (aindaPermitido()) atuais.current.onErro(erro.message || 'Não foi possível colar o conteúdo no mapa.');
      } finally {
        if (montado) setPendentes((valor) => valor - 1);
      }
    };
    window.addEventListener('paste', colar);
    return () => { montado = false; window.removeEventListener('paste', colar); };
  }, []);
  return pendentes > 0;
}
