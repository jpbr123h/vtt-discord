import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Stage, Layer, Line, Text, Rect, Group } from 'react-konva';
import MapaImagem from './components/MapaImagem';
import MesaToolbar from './components/MesaToolbar';
import TokenModal from './components/TokenModal';
import NumericTextInput from './components/NumericTextInput';
import { isTextEditingTarget } from './utils/keyboard';
import TokenGroupControls from './components/TokenGroupControls';
import TokenNode from './components/TokenNode';
import GridLayer from './components/GridLayer';
import MeasurementLayer from './components/MeasurementLayer';
import SelectionRectangle from './components/SelectionRectangle';
import CanvasTextEditor from './components/CanvasTextEditor';
import PainelManager from './components/manager';
import './App.css';

const TAMANHO_GRID = 50;
const METROS_POR_QUADRADO = 1.5;

// Componente principal da mesa: mantém o estado e conecta os componentes da interface.
export default function MesaRPG() {
  // Estados da mesa 🧠
  const [tokens, setTokens] = useState([]);
  const [tokensSelecionados, setTokensSelecionados] = useState([]);
  const [posicoesIniciais, setPosicoesIniciais] = useState({});
  const [grupoArrastado, setGrupoArrastado] = useState([]);
  const [selecaoArea, setSelecaoArea] = useState(null);
  const selecaoAreaConcluida = useRef(false);
  const posicoesGrupoMoldura = useRef(null);
  const redimensionamentoGrupo = useRef(null);
  const [janelaManager,setJanelaManager]= useState(false);
  const [janelaToken, setJanelaToken] = useState(false);
  const [corSelecionada, setCorSelecionada] = useState('#ff0044');
  const [imagemToken, setImagemToken] = useState(null);
  const [quantTokens, setQuantTokens] = useState(1);
  const [vidatoken, setVidaToken]=useState(0);
  const [nometoken, setNomeToken]=useState(null)
  const [urlMapa, setUrlMapa] = useState(null);
  const [ferramenta, setFerramenta] = useState('selecionar');
  const [anotacoes, setAnotacoes] = useState([]);
  const [anotacaoSelecionada, setAnotacaoSelecionada] = useState(null);
  const [anotacoesSelecionadas, setAnotacoesSelecionadas] = useState([]);
  const [abrirPainelAnotacao, setAbrirPainelAnotacao] = useState(false);
  const [menuToken, setMenuToken] = useState(null);
  const [corAnotacao, setCorAnotacao] = useState('#ffcc00');
  const [espessuraTraco, setEspessuraTraco] = useState(5);
  const [fonteAnotacao, setFonteAnotacao] = useState('Arial, sans-serif');
  const [tamanhoFonte, setTamanhoFonte] = useState(20);
  const [espacoTexto, setEspacoTexto] = useState({ boxWidth: 220, boxHeight: 72 });
  const [editorTexto, setEditorTexto] = useState(null);
  const stageRef = useRef(null);
  const tracoAtual = useRef(null);
  const arrasteAnotacoes = useRef(null);
  const anotacoesNoArrasteToken = useRef(null);
  const historicoRef = useRef([]);
  const estadoHistoricoRef = useRef({ tokens, anotacoes, urlMapa });
  const estadoPendenteRef = useRef(null);
  const temporizadorHistoricoRef = useRef(null);
  const desfazendoRef = useRef(false);

  // Estados de medição (Régua) 📏
  
  const [medindo, setMedindo] = useState(false);
  const [pontoInicial, setPontoInicial] = useState(null);
  const [pontoAtual, setPontoAtual] = useState(null);
  const [medido, setmedido]=useState(false)
  // Tamanho do palco/mapa 📐
  const [tamanhoPalco, setTamanhoPalco] = useState({
    largura: window.innerWidth,
    altura: window.innerHeight,
  });

  useEffect(() => {
    const estadoAtual = { tokens, anotacoes, urlMapa };
    if (desfazendoRef.current) {
      desfazendoRef.current = false;
      estadoHistoricoRef.current = estadoAtual;
      return;
    }

    const anterior = estadoHistoricoRef.current;
    if (anterior.tokens === tokens && anterior.anotacoes === anotacoes && anterior.urlMapa === urlMapa) return;

    if (!estadoPendenteRef.current) estadoPendenteRef.current = anterior;
    estadoHistoricoRef.current = estadoAtual;
    window.clearTimeout(temporizadorHistoricoRef.current);
    temporizadorHistoricoRef.current = window.setTimeout(() => {
      historicoRef.current.push(estadoPendenteRef.current);
      if (historicoRef.current.length > 50) historicoRef.current.shift();
      estadoPendenteRef.current = null;
    }, 300);

    return () => window.clearTimeout(temporizadorHistoricoRef.current);
  }, [tokens, anotacoes, urlMapa]);

  useEffect(() => {
    const desfazer = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
      if (isTextEditingTarget(e.target)) return;

      window.clearTimeout(temporizadorHistoricoRef.current);
      if (estadoPendenteRef.current) {
        historicoRef.current.push(estadoPendenteRef.current);
        if (historicoRef.current.length > 50) historicoRef.current.shift();
        estadoPendenteRef.current = null;
      }
      const anterior = historicoRef.current.pop();
      if (!anterior) return;

      e.preventDefault();
      desfazendoRef.current = true;
      estadoHistoricoRef.current = anterior;
      setTokens(anterior.tokens);
      setAnotacoes(anterior.anotacoes);
      setUrlMapa(anterior.urlMapa);
    };

    window.addEventListener('keydown', desfazer);
    return () => window.removeEventListener('keydown', desfazer);
  }, []);

  // Alternar modo de medição 📏
  const alternarMedindo = () => {
    setMedindo(!medindo);
    setPontoInicial(null);
    setPontoAtual(null);
    setMenuToken(null);
    setTokensSelecionados([]); // Limpa a seleção ao alternar
  };

  const limparAnotacoes = () => setAnotacoes([]);

  const selecionarAnotacao = (e, id) => {
    e.cancelBubble = true;
    setAbrirPainelAnotacao(!e.evt.shiftKey);
    if (e.evt.shiftKey) {
      const proximas = anotacoesSelecionadas.includes(id)
        ? anotacoesSelecionadas.filter((itemId) => itemId !== id)
        : [...anotacoesSelecionadas, id];
      setAnotacoesSelecionadas(proximas);
      setAnotacaoSelecionada(proximas.includes(id) ? id : (proximas[0] || null));
    } else {
      setTokensSelecionados([]);
      setAnotacaoSelecionada(id);
      setAnotacoesSelecionadas([id]);
    }
  };

  const iniciarArrasteAnotacao = (e, item) => {
    const ids = anotacoesSelecionadas.includes(item.id) ? anotacoesSelecionadas : [item.id];
    setAnotacaoSelecionada(item.id);
    setAnotacoesSelecionadas(ids);
    const origens = Object.fromEntries(anotacoes.filter((anotacao) => ids.includes(anotacao.id)).map((anotacao) => [anotacao.id, {
      x: anotacao.tipo === 'texto' ? anotacao.x : (anotacao.offsetX || 0),
      y: anotacao.tipo === 'texto' ? anotacao.y : (anotacao.offsetY || 0),
    }]));
    const tokensOriginais = Object.fromEntries(tokens
      .filter((token) => tokensSelecionados.includes(token.id))
      .map((token) => [token.id, { x: token.x, y: token.y }]));
    arrasteAnotacoes.current = { id: item.id, x: e.target.x(), y: e.target.y(), origens, tokensOriginais };
  };

  const moverAnotacaoSelecionada = (e) => {
    const arraste = arrasteAnotacoes.current;
    if (!arraste) return;
    const dx = e.target.x() - arraste.x;
    const dy = e.target.y() - arraste.y;
    setAnotacoes((atuais) => atuais.map((item) => {
      const origem = arraste.origens[item.id];
      if (!origem) return item;
      return item.tipo === 'texto'
        ? { ...item, x: origem.x + dx, y: origem.y + dy }
        : { ...item, offsetX: origem.x + dx, offsetY: origem.y + dy };
    }));
    setTokens((atuais) => atuais.map((token) => {
      const origem = arraste.tokensOriginais[token.id];
      return origem ? { ...token, x: origem.x + dx, y: origem.y + dy } : token;
    }));
  };

  const finalizarArrasteAnotacao = () => { arrasteAnotacoes.current = null; };

  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.container().style.cursor = ferramenta === 'texto' ? 'text' : 'default';
    }
  }, [ferramenta]);

  const salvarTextoCanvas = () => {
    if (!editorTexto) return;
    const texto = editorTexto.texto.trim();
    if (texto) {
      setAnotacoes((atuais) => {
        const anotacao = { ...editorTexto, id: editorTexto.id, tipo: 'texto', x: editorTexto.x, y: editorTexto.y, texto, cor: editorTexto.cor, fontFamily: editorTexto.fontFamily || fonteAnotacao, fontSize: editorTexto.fontSize || tamanhoFonte };
        return atuais.some((item) => item.id === anotacao.id)
          ? atuais.map((item) => item.id === anotacao.id ? anotacao : item)
          : [...atuais, anotacao];
      });
      setAnotacaoSelecionada(editorTexto.id);
      setAnotacoesSelecionadas([editorTexto.id]);
    } else {
      setAnotacoes((atuais) => atuais.filter((item) => item.id !== editorTexto.id));
    }
    setEditorTexto(null);
    setFerramenta('selecionar');
  };

  const redimensionarTexto = (id, dimensoes) => {
    setAnotacoes((atuais) => atuais.map((item) => item.id === id ? { ...item, ...dimensoes } : item));
    setEditorTexto((atual) => atual?.id === id ? { ...atual, ...dimensoes } : atual);
  };

  // Alternar modal e Criar Tokens 🪙
  const alternarToken = () => setJanelaToken(!janelaToken);

  const criarNovoToken = () => {
    const novosTokens = [];
    const quantidade = Math.max(1, Number(quantTokens) || 1);
    const vida = Number(vidatoken) || 0;
    for (let i = 0; i < quantidade; i++) {
      novosTokens.push({
        id: `${Date.now()}-${i}`,
        x: window.innerWidth / 2 + i * 10,
        y: window.innerHeight / 2,
        cor: corSelecionada,
        imagem: imagemToken,
        nome: nometoken,
        vida,
        vidamax: vida,
      });
    }
    setTokens((atuais) => [...atuais, ...novosTokens]);
    setJanelaToken(false);
  };

  const selecionarImagemToken = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => setImagemToken(leitor.result);
    leitor.readAsDataURL(arquivo);
    e.target.value = '';
  };

  // Exclusão de Tokens Selecionados 🗑️
  const removerTokensSelecionados = () => {
    setTokens((tokensAtuais) =>
      tokensAtuais.filter((tk) => !tokensSelecionados.includes(tk.id))
    );
    setTokensSelecionados([]);
  };

  const selecionarToken = (e, id) => {
    if (medindo || ferramenta !== 'selecionar') return;
    e.cancelBubble = true;
    if (!e.evt.shiftKey) {
      setAnotacoesSelecionadas([]);
      setAnotacaoSelecionada(null);
      setAbrirPainelAnotacao(false);
    }
    if (e.evt.shiftKey) {
      setTokensSelecionados((atuais) => atuais.includes(id)
        ? atuais.filter((tokenId) => tokenId !== id)
        : [...atuais, id]);
    } else {
      setTokensSelecionados([id]);
    }
  };

  const limparSelecaoNoDuploClique = (e) => {
    e.cancelBubble = true;
    if (!e.evt.shiftKey) setTokensSelecionados([]);
  };

  useEffect(() => {
    const tratarTeclas = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (isTextEditingTarget(e.target)) return;
      if (janelaToken || janelaManager || menuToken || tokensSelecionados.length === 0) return;

      e.preventDefault();
      const idsSelecionados = new Set(tokensSelecionados);
      setTokens((atuais) => atuais.filter((token) => !idsSelecionados.has(token.id)));
      setTokensSelecionados([]);
    };
    window.addEventListener('keydown', tratarTeclas);
    return () => window.removeEventListener('keydown', tratarTeclas);
  }, [tokensSelecionados, janelaToken, janelaManager, menuToken]);

  // Movimentação Fluida (Solo e em Grupo) 🚚
  const handleDragStart = (e, idLider) => {
    setMenuToken(null);
    const grupo = tokensSelecionados.includes(idLider)
      ? tokensSelecionados
      : [idLider];
    const mapaPosicoes = {};
    tokens.forEach((tk) => {
      if (grupo.includes(tk.id)) {
        mapaPosicoes[tk.id] = { x: tk.x, y: tk.y };
      }
    });
    setGrupoArrastado(grupo);
    setPosicoesIniciais(mapaPosicoes);
    anotacoesNoArrasteToken.current = Object.fromEntries(anotacoes
      .filter((item) => anotacoesSelecionadas.includes(item.id))
      .map((item) => [item.id, {
        x: item.tipo === 'texto' ? item.x : (item.offsetX || 0),
        y: item.tipo === 'texto' ? item.y : (item.offsetY || 0),
      }]));
  };

  const handleDragMove = (e, idLider) => {
    const posInicialLider = posicoesIniciais[idLider];
    if (!posInicialLider) return;

    const xAtualLider = e.target.x();
    const yAtualLider = e.target.y();

    const deltaX = xAtualLider - posInicialLider.x;
    const deltaY = yAtualLider - posInicialLider.y;

    setTokens((tokensAtuais) =>
      tokensAtuais.map((tk) => {
        if (tk.id === idLider) {
          return { ...tk, x: xAtualLider, y: yAtualLider };
        }
        if (grupoArrastado.includes(tk.id)) {
          const inicio = posicoesIniciais[tk.id];
          if (inicio) {
            return {
              ...tk,
              x: inicio.x + deltaX,
              y: inicio.y + deltaY,
            };
          }
        }
        return tk;
      })
    );
    const anotacoesOriginais = anotacoesNoArrasteToken.current || {};
    setAnotacoes((atuais) => atuais.map((item) => {
      const origem = anotacoesOriginais[item.id];
      if (!origem) return item;
      return item.tipo === 'texto'
        ? { ...item, x: origem.x + deltaX, y: origem.y + deltaY }
        : { ...item, offsetX: origem.x + deltaX, offsetY: origem.y + deltaY };
    }));
  };

  const handleDragEnd = (e, idLider) => {
    const raio = TAMANHO_GRID / 2;
    const circulo = e.target;

    const inicioLider = posicoesIniciais[idLider] || { x: circulo.x(), y: circulo.y() };

    const coluna = Math.floor(circulo.x() / TAMANHO_GRID);
    const linha = Math.floor(circulo.y() / TAMANHO_GRID);

    let xLiderNovo = coluna * TAMANHO_GRID + raio;
    let yLiderNovo = linha * TAMANHO_GRID + raio;

    // Limites do Palco
    if (xLiderNovo < raio) xLiderNovo = raio;
    if (xLiderNovo > tamanhoPalco.largura - raio) xLiderNovo = tamanhoPalco.largura - raio;
    if (yLiderNovo < raio) yLiderNovo = raio;
    if (yLiderNovo > tamanhoPalco.altura - raio) yLiderNovo = tamanhoPalco.altura - raio;

    const deltaX = xLiderNovo - inicioLider.x;
    const deltaY = yLiderNovo - inicioLider.y;

    const novosTokens = tokens.map((tk) => {
      if (grupoArrastado.includes(tk.id)) {
        const inicio = posicoesIniciais[tk.id] || { x: tk.x, y: tk.y };
        return {
          ...tk,
          x: inicio.x + deltaX,
          y: inicio.y + deltaY,
        };
      }
      return tk;
    });

    setTokens(novosTokens);
    const anotacoesOriginais = anotacoesNoArrasteToken.current || {};
    setAnotacoes((atuais) => atuais.map((item) => {
      const origem = anotacoesOriginais[item.id];
      if (!origem) return item;
      return item.tipo === 'texto'
        ? { ...item, x: origem.x + deltaX, y: origem.y + deltaY }
        : { ...item, offsetX: origem.x + deltaX, offsetY: origem.y + deltaY };
    }));
    anotacoesNoArrasteToken.current = null;
    setPosicoesIniciais({});
    setGrupoArrastado([]);
  };

  const obterRetanguloSelecao = (area) => ({
    esquerda: Math.min(area.x1, area.x2),
    direita: Math.max(area.x1, area.x2),
    topo: Math.min(area.y1, area.y2),
    base: Math.max(area.y1, area.y2),
  });

  const finalizarSelecaoArea = () => {
    if (!selecaoArea) return;
    selecaoAreaConcluida.current = true;
    const retangulo = obterRetanguloSelecao(selecaoArea);
    const idsDentro = tokens
      .filter((tk) => {
        const raio = (TAMANHO_GRID / 2 - 2) * (tk.escala || 1);
        return tk.x - raio >= retangulo.esquerda && tk.x + raio <= retangulo.direita &&
          tk.y - raio >= retangulo.topo && tk.y + raio <= retangulo.base;
      })
      .map((tk) => tk.id);
    const anotacoesDentro = anotacoes.filter((item) => {
      let limites;
      if (item.tipo === 'traco') {
        const xs = item.pontos.filter((_, i) => i % 2 === 0).map((x) => x + (item.offsetX || 0));
        const ys = item.pontos.filter((_, i) => i % 2 === 1).map((y) => y + (item.offsetY || 0));
        const margem = item.espessura / 2;
        limites = { esquerda: Math.min(...xs) - margem, direita: Math.max(...xs) + margem, topo: Math.min(...ys) - margem, base: Math.max(...ys) + margem };
      } else {
        const largura = item.boxWidth || Math.max(48, Math.max(...item.texto.split('\n').map((linha) => linha.length)) * (item.fontSize || 20) * 0.62 + 16);
        const altura = item.boxHeight || item.texto.split('\n').length * (item.fontSize || 20) * 1.25 + 12;
        limites = { esquerda: item.x, direita: item.x + largura, topo: item.y, base: item.y + altura };
      }
      return limites.esquerda >= retangulo.esquerda && limites.direita <= retangulo.direita &&
        limites.topo >= retangulo.topo && limites.base <= retangulo.base;
    }).map((item) => item.id);

    setAnotacoesSelecionadas((atuais) => selecaoArea.adicionar
      ? [...new Set([...atuais, ...anotacoesDentro])]
      : anotacoesDentro);
    setAnotacaoSelecionada(anotacoesDentro[0] || null);
    setAbrirPainelAnotacao(false);
    setTokensSelecionados((atuais) => selecaoArea.adicionar
      ? [...new Set([...atuais, ...idsDentro])]
      : idsDentro);
    setSelecaoArea(null);
  };

  const tokensDoGrupo = tokens.filter((tk) => tokensSelecionados.includes(tk.id));
  const anotacoesDoGrupo = anotacoes.filter((item) => anotacoesSelecionadas.includes(item.id));
  const limitesAnotacoes = anotacoesDoGrupo.length ? (() => {
    const caixas = anotacoesDoGrupo.map((item) => {
      if (item.tipo === 'texto') {
        const largura = item.boxWidth || Math.max(48, Math.max(...item.texto.split('\n').map((linha) => linha.length)) * (item.fontSize || 20) * 0.62 + 16);
        const altura = item.boxHeight || item.texto.split('\n').length * (item.fontSize || 20) * 1.25 + 12;
        return { esquerda: item.x, direita: item.x + largura, topo: item.y, base: item.y + altura };
      }
      const xs = item.pontos.filter((_, indice) => indice % 2 === 0).map((x) => x + (item.offsetX || 0));
      const ys = item.pontos.filter((_, indice) => indice % 2 === 1).map((y) => y + (item.offsetY || 0));
      return { esquerda: Math.min(...xs), direita: Math.max(...xs), topo: Math.min(...ys), base: Math.max(...ys) };
    });
    return {
      esquerda: Math.min(...caixas.map((caixa) => caixa.esquerda)) - 8,
      direita: Math.max(...caixas.map((caixa) => caixa.direita)) + 8,
      topo: Math.min(...caixas.map((caixa) => caixa.topo)) - 8,
      base: Math.max(...caixas.map((caixa) => caixa.base)) + 8,
    };
  })() : null;
  const limitesGrupo = tokensDoGrupo.length > 0 ? {
    esquerda: Math.min(...tokensDoGrupo.map((tk) => tk.x - (TAMANHO_GRID / 2 - 2) * (tk.escala || 1))) - 8,
    direita: Math.max(...tokensDoGrupo.map((tk) => tk.x + (TAMANHO_GRID / 2 - 2) * (tk.escala || 1))) + 8,
    topo: Math.min(...tokensDoGrupo.map((tk) => tk.y - (TAMANHO_GRID / 2 - 2) * (tk.escala || 1))) - 8,
    base: Math.max(...tokensDoGrupo.map((tk) => tk.y + (TAMANHO_GRID / 2 - 2) * (tk.escala || 1))) + 8,
  } : null;
  const limitesItensSelecionados = (() => {
    if (!limitesAnotacoes) return limitesGrupo;
    if (!limitesGrupo) return limitesAnotacoes;
    return {
      esquerda: Math.min(limitesAnotacoes.esquerda, limitesGrupo.esquerda),
      direita: Math.max(limitesAnotacoes.direita, limitesGrupo.direita),
      topo: Math.min(limitesAnotacoes.topo, limitesGrupo.topo),
      base: Math.max(limitesAnotacoes.base, limitesGrupo.base),
    };
  })();

  const espelharGrupo = (eixo) => {
    if (!limitesGrupo) return;
    const centro = eixo === 'horizontal'
      ? (limitesGrupo.esquerda + limitesGrupo.direita) / 2
      : (limitesGrupo.topo + limitesGrupo.base) / 2;
    setTokens((atuais) => atuais.map((tk) => {
      if (!tokensSelecionados.includes(tk.id)) return tk;
      return eixo === 'horizontal'
        ? { ...tk, x: centro * 2 - tk.x }
        : { ...tk, y: centro * 2 - tk.y };
    }));
  };

  const iniciarRedimensionamento = (canto) => {
    if (!limitesGrupo) return;
    const ancora = {
      x: canto.includes('e') ? limitesGrupo.esquerda : limitesGrupo.direita,
      y: canto.includes('s') ? limitesGrupo.topo : limitesGrupo.base,
    };
    redimensionamentoGrupo.current = {
      ancora,
      limites: { ...limitesGrupo },
      posicoes: Object.fromEntries(tokensDoGrupo.map((tk) => [tk.id, {
        x: tk.x, y: tk.y, escala: tk.escala || 1,
      }])),
    };
  };

  const moverAlcaRedimensionamento = (e) => {
    const inicio = redimensionamentoGrupo.current;
    if (!inicio) return;
    const larguraInicial = Math.max(1, inicio.limites.direita - inicio.limites.esquerda);
    const alturaInicial = Math.max(1, inicio.limites.base - inicio.limites.topo);
    const escalaX = Math.max(0.25, Math.min(4, Math.abs(e.target.x() - inicio.ancora.x) / larguraInicial));
    const escalaY = Math.max(0.25, Math.min(4, Math.abs(e.target.y() - inicio.ancora.y) / alturaInicial));
    const escala = (escalaX + escalaY) / 2;
    setTokens((atuais) => atuais.map((tk) => {
      const origem = inicio.posicoes[tk.id];
      if (!origem) return tk;
      return {
        ...tk,
        x: inicio.ancora.x + (origem.x - inicio.ancora.x) * escala,
        y: inicio.ancora.y + (origem.y - inicio.ancora.y) * escala,
        escala: Math.max(0.25, Math.min(4, origem.escala * escala)),
      };
    }));
  };

  const finalizarRedimensionamento = () => {
    redimensionamentoGrupo.current = null;
  };

  const iniciarArrasteMoldura = () => {
    posicoesGrupoMoldura.current = {
      posicoes: Object.fromEntries(tokensDoGrupo.map((tk) => [tk.id, { x: tk.x, y: tk.y }])),
      limites: { ...limitesGrupo },
    };
  };

  const moverGrupoPelaMoldura = (e) => {
    if (!posicoesGrupoMoldura.current) return;
    const { posicoes, limites } = posicoesGrupoMoldura.current;
    const deltaX = e.target.x() - limites.esquerda;
    const deltaY = e.target.y() - limites.topo;
    setTokens((atuais) => atuais.map((tk) => {
      const inicio = posicoes[tk.id];
      return inicio ? { ...tk, x: inicio.x + deltaX, y: inicio.y + deltaY } : tk;
    }));
  };

  const finalizarArrasteMoldura = (e) => {
    if (!posicoesGrupoMoldura.current) return;
    const { posicoes, limites } = posicoesGrupoMoldura.current;
    const raio = TAMANHO_GRID / 2;
    let deltaX = Math.round((e.target.x() - limites.esquerda) / TAMANHO_GRID) * TAMANHO_GRID;
    let deltaY = Math.round((e.target.y() - limites.topo) / TAMANHO_GRID) * TAMANHO_GRID;
    const grupo = Object.values(posicoes);
    const minX = Math.min(...grupo.map((p) => p.x - raio));
    const maxX = Math.max(...grupo.map((p) => p.x + raio));
    const minY = Math.min(...grupo.map((p) => p.y - raio));
    const maxY = Math.max(...grupo.map((p) => p.y + raio));
    deltaX = Math.max(raio - minX, Math.min(tamanhoPalco.largura - raio - maxX, deltaX));
    deltaY = Math.max(raio - minY, Math.min(tamanhoPalco.altura - raio - maxY, deltaY));
    setTokens((atuais) => atuais.map((tk) => {
      const inicio = posicoes[tk.id];
      return inicio ? { ...tk, x: inicio.x + deltaX, y: inicio.y + deltaY } : tk;
    }));
    posicoesGrupoMoldura.current = null;
    e.target.position({ x: limites.esquerda + deltaX, y: limites.topo + deltaY });
  };

  // Carregar Mapa de Imagem 📂
  const handleCarregarMapa = (e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
      const url = URL.createObjectURL(arquivo);
      setUrlMapa(url);
    }
  };

  const handleMapaCarregado = useCallback(({ largura, altura }) => {
    setTamanhoPalco({ largura, altura });
  }, []);

  // Controle de Zoom e Pan 🔍
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const escalaAntiga = stage.scaleX();
    const ponteiro = stage.getPointerPosition();

    const fatorZoom = 1.05;
    const novaEscala = e.evt.deltaY < 0 ? escalaAntiga * fatorZoom : escalaAntiga / fatorZoom;

    stage.scale({ x: novaEscala, y: novaEscala });

    const novaPosicao = {
      x: ponteiro.x - (ponteiro.x - stage.x()) * (novaEscala / escalaAntiga),
      y: ponteiro.y - (ponteiro.y - stage.y()) * (novaEscala / escalaAntiga),
    };
    stage.position(novaPosicao);
  };

  // Cálculo da Régua de Medição 📐
  const calcularDistancia = (ponto1, ponto2) => {
    if (!ponto1 || !ponto2) return 0;
    const dx = ponto2.x - ponto1.x;
    const dy = ponto2.y - ponto1.y;
    const distanciaEmPixels = Math.sqrt(dx * dx + dy * dy);
    const quantidadeQuadrados = distanciaEmPixels / TAMANHO_GRID;
    return (quantidadeQuadrados * METROS_POR_QUADRADO).toFixed(1);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#1a1a1a', overflow: 'hidden' }}>
      
      <MesaToolbar
        medindo={medindo}
        ferramenta={ferramenta}
        corAnotacao={corAnotacao}
        espessuraTraco={espessuraTraco}
        quantidadeAnotacoes={anotacoes.length}
        quantidadeAnotacoesSelecionadas={anotacoesSelecionadas.length}
        mostrarOpcoesAnotacao={abrirPainelAnotacao}
        anotacaoSelecionada={anotacoes.find((item) => item.id === anotacaoSelecionada) || null}
        onAnotacaoChange={(id, alteracoes) => {
          setAnotacoes((atuais) => atuais.map((item) => item.id === id ? { ...item, ...alteracoes } : item));
          setEditorTexto((atual) => atual?.id === id ? { ...atual, ...alteracoes } : atual);
        }}
        onDeselecionarAnotacao={() => setAnotacaoSelecionada(null)}
        fonteAnotacao={fonteAnotacao}
        onFonteAnotacaoChange={(fonte) => {
          setFonteAnotacao(fonte);
          setEditorTexto((atual) => atual ? { ...atual, fontFamily: fonte } : atual);
        }}
        tamanhoFonte={tamanhoFonte}
        onTamanhoFonteChange={(tamanho) => {
          setTamanhoFonte(tamanho);
          setEditorTexto((atual) => atual ? { ...atual, fontSize: tamanho } : atual);
        }}
        espacoTexto={editorTexto ? { boxWidth: editorTexto.boxWidth || espacoTexto.boxWidth, boxHeight: editorTexto.boxHeight || espacoTexto.boxHeight } : espacoTexto}
        onEspacoTextoChange={(dimensoes) => {
          setEspacoTexto((atual) => ({ ...atual, ...dimensoes }));
          setEditorTexto((atual) => atual ? { ...atual, ...dimensoes } : atual);
        }}
        onExcluirAnotacao={() => {
          setAnotacoes((atuais) => atuais.filter((item) => item.id !== anotacaoSelecionada));
          setAnotacaoSelecionada(null);
        }}
        onFerramentaChange={(proxima) => {
          const novaFerramenta = ferramenta === proxima && proxima !== 'selecionar' ? 'selecionar' : proxima;
          if (ferramenta === 'texto' && novaFerramenta !== 'texto' && editorTexto) salvarTextoCanvas();
          setFerramenta(novaFerramenta);
          setAnotacaoSelecionada(null);
          setMedindo(false);
          setPontoInicial(null);
          setPontoAtual(null);
          setTokensSelecionados([]);
        }}
        onCorAnotacaoChange={setCorAnotacao}
        onEspessuraTracoChange={setEspessuraTraco}
        onLimparAnotacoes={limparAnotacoes}
        quantidadeSelecionada={tokensSelecionados.length}
        onNovoToken={alternarToken}
        onCarregarMapa={handleCarregarMapa}
        onAlternarMedicao={() => {
          setFerramenta('selecionar');
          alternarMedindo();
        }}
        onExcluirSelecionados={removerTokensSelecionados}
        onJanelaManager={()=> setJanelaManager(!janelaManager)}
        managerAberto={janelaManager}
      />
      {janelaManager &&(
        <PainelManager
          isOpen={janelaManager}
          onClose={() => setJanelaManager(false)}
          tokens={tokens}
          setTokens={setTokens}
        />
      )}
      {janelaToken && (
        <TokenModal
          quantidade={quantTokens}
          nome={nometoken}
          vida={vidatoken}
          cor={corSelecionada}
          imagem={imagemToken}
          onQuantidadeChange={setQuantTokens}
          onNomeChange={setNomeToken}
          onVidaChange={setVidaToken}
          onCorChange={setCorSelecionada}
          onImagemChange={selecionarImagemToken}
          onLimparImagem={() => setImagemToken(null)}
          onCriar={criarNovoToken}
          onFechar={alternarToken}
        />
      )}

      {menuToken && (() => {
        const token = tokens.find((item) => item.id === menuToken.id);
        if (!token) return null;
        const atualizarToken = (alteracoes) => setTokens((atuais) => atuais.map((item) => item.id === token.id ? { ...item, ...alteracoes } : item));
        const fechar = () => setMenuToken(null);
        return (
          <div className="token-contextual" style={{ left: menuToken.x, top: menuToken.y }} onMouseDown={(e) => e.stopPropagation()}>
            <strong>Token {token.nome}</strong>
            <label className="token-contextual__nome">
              Nome
              <input
                type="text"
                value={token.nome || ''}
                onChange={(e) => atualizarToken({ nome: e.target.value })}
                aria-label="Nome do token"
              />
            </label>
            <label className="token-contextual__vida">
              <span>Vida atual</span>
              <div className="token-contextual__vida-controle">
                <NumericTextInput
                  value={token.vida ?? 0}
                  min="0"
                  aria-label="Vida atual do token"
                  onChange={(vida) => atualizarToken({ vida: vida === '' ? 0 : vida })}
                />
                <span>/ {token.vidamax ?? token.vida ?? 0} PV</span>
              </div>
            </label>
            <label className="token-contextual__cor">Cor <input type="color" value={token.cor || '#ff0044'} onChange={(e) => atualizarToken({ cor: e.target.value, imagem: null })} /></label>
            <button onClick={() => { atualizarToken({ escala: Math.min(4, (token.escala || 1) + 0.25) }); fechar(); }}>Aumentar tamanho</button>
            <button onClick={() => { atualizarToken({ escala: Math.max(0.25, (token.escala || 1) - 0.25) }); fechar(); }}>Diminuir tamanho</button>
            <button onClick={() => { setTokens((atuais) => [...atuais, { ...token, id: `${Date.now()}-copia`, x: Math.min(tamanhoPalco.largura - 25, token.x + TAMANHO_GRID), y: Math.min(tamanhoPalco.altura - 25, token.y + TAMANHO_GRID) }]); fechar(); }}>Duplicar token</button>
            <button className="token-contextual__excluir" onClick={() => { setTokens((atuais) => atuais.filter((item) => item.id !== token.id)); setTokensSelecionados((atuais) => atuais.filter((id) => id !== token.id)); fechar(); }}>Excluir token</button>
          </div>
        );
      })()}

      {/* O Palco do Konva 🎬 */}
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onWheel={handleWheel}
        onContextMenu={(e) => e.evt.preventDefault()}
        onClick={(e) => {
          if (ferramenta === 'texto') {
            if (editorTexto) return;
            const pos = e.target.getStage().getRelativePointerPosition();
            setEditorTexto({ id: `${Date.now()}-${Math.random()}`, x: pos.x, y: pos.y, texto: '', cor: corAnotacao, fontFamily: fonteAnotacao, fontSize: tamanhoFonte, ...espacoTexto });
            return;
          }
          // Limpa a seleção ao clicar no fundo
          if (e.target === e.target.getStage() && !medindo) {
            setMenuToken(null);
            if (selecaoAreaConcluida.current) {
              selecaoAreaConcluida.current = false;
            } else {
              setAnotacaoSelecionada(null);
              setAnotacoesSelecionadas([]);
              setAbrirPainelAnotacao(false);
              setTokensSelecionados([]);
            }
          }
        }}
        onMouseDown={(e) => {
          // Arrastar em uma área vazia cria uma seleção retangular.
          if (e.evt.button === 0 && !medindo && ferramenta === 'selecionar' && e.target === e.target.getStage()) {
            const stage = e.target.getStage();
            const pos = stage.getRelativePointerPosition();
            setSelecaoArea({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, adicionar: e.evt.shiftKey });
          }
          // Arrastar Mapa com Botão Direito (Pan)
          if (e.evt.button === 2) {
            const stage = e.target.getStage();
            stage.draggable(true);
            stage.startDrag();
          }
          // Iniciar Medição com Botão Esquerdo
          if (medindo && e.evt.button === 0) {
            const stage = e.target.getStage();
            const pos = stage.getRelativePointerPosition();
            if(pontoInicial== null||!medido){
              setPontoInicial(pos);
              setPontoAtual(null);
              setmedido(true);
            }else {
              setPontoAtual(pos);
              setmedido(false);
            }
            
            
          }
          if (e.evt.button === 0 && ferramenta === 'desenhar' && e.target === e.target.getStage()) {
            const pos = e.target.getStage().getRelativePointerPosition();
            const id = `${Date.now()}-${Math.random()}`;
            tracoAtual.current = id;
            setAnotacoes((atuais) => [...atuais, { id, tipo: 'traco', pontos: [pos.x, pos.y], cor: corAnotacao, espessura: espessuraTraco }]);
          }
        }}
        onMouseMove={(e) => {
          if (ferramenta === 'texto') e.target.getStage().container().style.cursor = 'text';
          if (selecaoArea) {
            const pos = e.target.getStage().getRelativePointerPosition();
            setSelecaoArea((area) => area && ({ ...area, x2: pos.x, y2: pos.y }));
          }
          if (medindo && pontoInicial && medido) {
            const stage = e.target.getStage();
            const pos = stage.getRelativePointerPosition();
            setPontoAtual(pos);
          }
          if (tracoAtual.current) {
            const pos = e.target.getStage().getRelativePointerPosition();
            setAnotacoes((atuais) => atuais.map((item) => item.id === tracoAtual.current
              ? { ...item, pontos: [...item.pontos, pos.x, pos.y] }
              : item));
          }
        }}
        onMouseUp={(e) => {
          if (selecaoArea && e.evt.button === 0) finalizarSelecaoArea();
          if (e.evt.button === 2) {
            const stage = e.target.getStage();
            stage.draggable(false);
          }
          if (medindo && e.evt.button === 0) {
            //setPontoInicial(null);
            //setPontoAtual(null);
          }
          if (e.evt.button === 0) tracoAtual.current = null;
        }}
      >
        {/* Camada 1: Mapa de Imagem 🖼️ */}
        <Layer>
          {urlMapa && <MapaImagem url={urlMapa} onMapaCarregado={handleMapaCarregado} />}
        </Layer>

        {/* Camada 2: Grid 📐 */}
        <GridLayer
          largura={tamanhoPalco.largura}
          altura={tamanhoPalco.altura}
          tamanhoCelula={TAMANHO_GRID}
        />

        {/* Camada de desenho e escrita */}
        <Layer listening={ferramenta !== 'desenhar' && !medindo}>
          {anotacoes.map((item) => item.tipo === 'traco' ? (
            <Line key={item.id} points={item.pontos} stroke={item.cor} strokeWidth={item.espessura}
              x={item.offsetX || 0} y={item.offsetY || 0}
              listening={ferramenta === 'selecionar' && !medindo}
              shadowColor={anotacoesSelecionadas.includes(item.id) ? '#53a9ff' : undefined}
              shadowBlur={anotacoesSelecionadas.includes(item.id) ? 8 : 0}
              draggable={ferramenta === 'selecionar' && !medindo}
              lineCap="round" lineJoin="round" hitStrokeWidth={Math.max(16, item.espessura + 10)}
              onClick={(e) => selecionarAnotacao(e, item.id)}
              onDragStart={(e) => iniciarArrasteAnotacao(e, item)} onDragMove={moverAnotacaoSelecionada} onDragEnd={finalizarArrasteAnotacao} />
          ) : item.id === editorTexto?.id ? null : (
            <Group key={item.id} x={item.x} y={item.y} draggable={ferramenta === 'selecionar' && !medindo}
              onClick={(e) => {
                if (ferramenta === 'texto') {
                  e.cancelBubble = true;
                  setEditorTexto({ ...item, id: item.id, x: item.x, y: item.y, texto: item.texto, cor: item.cor, fontFamily: item.fontFamily || fonteAnotacao, fontSize: item.fontSize || tamanhoFonte });
                } else selecionarAnotacao(e, item.id);
              }}
              onDblClick={(e) => { e.cancelBubble = true; setFerramenta('texto'); setEditorTexto({ ...item, id: item.id, x: item.x, y: item.y, texto: item.texto, cor: item.cor, fontFamily: item.fontFamily || fonteAnotacao, fontSize: item.fontSize || tamanhoFonte }); }}
              onDragStart={(e) => iniciarArrasteAnotacao(e, item)} onDragMove={moverAnotacaoSelecionada} onDragEnd={finalizarArrasteAnotacao}>
              <Rect width={item.boxWidth || Math.max(48, Math.max(...item.texto.split('\n').map((linha) => linha.length)) * (item.fontSize || 20) * 0.62 + 16)}
                height={item.boxHeight || item.texto.split('\n').length * (item.fontSize || 20) * 1.25 + 12}
                fill="rgba(12, 16, 24, 0)"
                stroke={anotacoesSelecionadas.includes(item.id) ? '#53a9ff' : 'rgba(255,255,255,0.28)'}
                strokeWidth={anotacoesSelecionadas.includes(item.id) ? 2 : 1} cornerRadius={6} />
              <Text x={8} y={6} width={item.boxWidth ? item.boxWidth - 16 : undefined} height={item.boxHeight ? item.boxHeight - 12 : undefined}
                text={item.texto} fill={item.cor} fontSize={item.fontSize || 20} fontStyle="bold" fontFamily={item.fontFamily || 'Arial, sans-serif'} wrap="word"
                shadowColor="black" shadowBlur={2} shadowOpacity={0.5} />
              {anotacaoSelecionada === item.id && ferramenta === 'selecionar' && !medindo && (() => {
                const largura = item.boxWidth || Math.max(48, Math.max(...item.texto.split('\n').map((linha) => linha.length)) * (item.fontSize || 20) * 0.62 + 16);
                const altura = item.boxHeight || item.texto.split('\n').length * (item.fontSize || 20) * 1.25 + 12;
                return <Rect x={largura - 12} y={altura - 12} width={12} height={12} fill="#53a9ff" stroke="white" strokeWidth={1}
                  draggable
                  onMouseDown={(e) => { e.cancelBubble = true; }}
                  onDragStart={(e) => { e.cancelBubble = true; }}
                  onDragMove={(e) => {
                    e.cancelBubble = true;
                    redimensionarTexto(item.id, {
                      boxWidth: Math.max(80, Math.min(600, e.target.x() + 12)),
                      boxHeight: Math.max(50, Math.min(500, e.target.y() + 12)),
                    });
                  }}
                  onMouseEnter={(e) => { e.target.getStage().container().style.cursor = 'nwse-resize'; }}
                  onMouseLeave={(e) => { e.target.getStage().container().style.cursor = 'default'; }} />;
              })()}
            </Group>
          ))}
        </Layer>

        {/* Camada 3: Tokens 🪙 */}
        <Layer>
          <SelectionRectangle area={selecaoArea} obterLimites={obterRetanguloSelecao} />
          <TokenGroupControls
            limites={limitesGrupo}
            visivel={!medindo && anotacoesSelecionadas.length === 0}
            onArrasteMolduraInicio={iniciarArrasteMoldura}
            onArrasteMoldura={moverGrupoPelaMoldura}
            onArrasteMolduraFim={finalizarArrasteMoldura}
            onRedimensionarInicio={iniciarRedimensionamento}
            onRedimensionar={moverAlcaRedimensionamento}
            onRedimensionarFim={finalizarRedimensionamento}
            onEspelharHorizontal={() => espelharGrupo('horizontal')}
            onEspelharVertical={() => espelharGrupo('vertical')}
          />
          {tokens.map((tk) => (
            <TokenNode
              key={tk.id}
              token={tk}
              raio={TAMANHO_GRID / 2 - 2}
              selecionado={tokensSelecionados.includes(tk.id)}
              medindo={medindo || ferramenta !== 'selecionar'}
              ferramenta={ferramenta}
              onSelecionar={selecionarToken}
              onDuploClique={limparSelecaoNoDuploClique}
              onArrasteInicio={handleDragStart}
              onArraste={handleDragMove}
              onArrasteFim={handleDragEnd}
              onMenuContexto={(e, id) => {
                setMenuToken({ id, x: Math.min(e.evt.clientX, window.innerWidth - 220), y: Math.min(e.evt.clientY, window.innerHeight - 240) });
                setTokensSelecionados([id]);
              }}
            />
          ))}
        </Layer>

        {anotacoesSelecionadas.length > 0 && limitesItensSelecionados && ferramenta === 'selecionar' && (
          <Layer listening={false}>
            <Rect x={limitesItensSelecionados.esquerda} y={limitesItensSelecionados.topo}
              width={limitesItensSelecionados.direita - limitesItensSelecionados.esquerda}
              height={limitesItensSelecionados.base - limitesItensSelecionados.topo}
              stroke="#53a9ff" strokeWidth={2} dash={[7, 4]} />
          </Layer>
        )}

        {/* Camada 4: Régua de Medição 📏 */}
        <MeasurementLayer inicio={pontoInicial} atual={pontoAtual} distancia={calcularDistancia} />
      </Stage>
      {editorTexto && <CanvasTextEditor stageRef={stageRef} editor={editorTexto}
        onChange={(texto) => setEditorTexto((atual) => atual && ({ ...atual, texto }))}
        onCommit={salvarTextoCanvas} onCancel={() => { setEditorTexto(null); setFerramenta('selecionar'); }} />}
    </div>
  );
}
