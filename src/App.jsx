import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Stage, Layer } from 'react-konva';
import MapaImagem from './components/MapaImagem';
import MesaToolbar from './components/MesaToolbar';
import TokenModal from './components/TokenModal';
import TokenGroupControls from './components/TokenGroupControls';
import TokenNode from './components/TokenNode';
import GridLayer from './components/GridLayer';
import MeasurementLayer from './components/MeasurementLayer';
import SelectionRectangle from './components/SelectionRectangle';
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
  const [janelaToken, setJanelaToken] = useState(false);
  const [corSelecionada, setCorSelecionada] = useState('#ff0044');
  const [imagemToken, setImagemToken] = useState(null);
  const [quantTokens, setQuantTokens] = useState(1);
  const [urlMapa, setUrlMapa] = useState(null);

  // Estados de medição (Régua) 📏
  const [medindo, setMedindo] = useState(false);
  const [pontoInicial, setPontoInicial] = useState(null);
  const [pontoAtual, setPontoAtual] = useState(null);

  // Tamanho do palco/mapa 📐
  const [tamanhoPalco, setTamanhoPalco] = useState({
    largura: window.innerWidth,
    altura: window.innerHeight,
  });

  // Alternar modo de medição 📏
  const alternarMedindo = () => {
    setMedindo(!medindo);
    setPontoInicial(null);
    setPontoAtual(null);
    setTokensSelecionados([]); // Limpa a seleção ao alternar
  };

  // Alternar modal e Criar Tokens 🪙
  const alternarToken = () => setJanelaToken(!janelaToken);

  const criarNovoToken = () => {
    const novosTokens = [];
    for (let i = 0; i < quantTokens; i++) {
      novosTokens.push({
        id: `${Date.now()}-${i}`,
        x: window.innerWidth / 2 + i * 10,
        y: window.innerHeight / 2,
        cor: corSelecionada,
        imagem: imagemToken,
      });
    }
    setTokens([...tokens, ...novosTokens]);
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
    if (medindo) return;
    e.cancelBubble = true;
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
      if (e.key === 'Delete' || e.key === 'Backspace') {
        removerTokensSelecionados();
      }
    };
    window.addEventListener('keydown', tratarTeclas);
    return () => window.removeEventListener('keydown', tratarTeclas);
  }, [tokensSelecionados]);

  // Movimentação Fluida (Solo e em Grupo) 🚚
  const handleDragStart = (e, idLider) => {
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
        return tk.x - raio >= retangulo.esquerda &&
          tk.x + raio <= retangulo.direita &&
          tk.y - raio >= retangulo.topo &&
          tk.y + raio <= retangulo.base;
      })
      .map((tk) => tk.id);

    setTokensSelecionados((atuais) => selecaoArea.adicionar
      ? [...new Set([...atuais, ...idsDentro])]
      : idsDentro);
    setSelecaoArea(null);
  };

  const tokensDoGrupo = tokens.filter((tk) => tokensSelecionados.includes(tk.id));
  const limitesGrupo = tokensDoGrupo.length > 0 ? {
    esquerda: Math.min(...tokensDoGrupo.map((tk) => tk.x - (TAMANHO_GRID / 2 - 2) * (tk.escala || 1))) - 8,
    direita: Math.max(...tokensDoGrupo.map((tk) => tk.x + (TAMANHO_GRID / 2 - 2) * (tk.escala || 1))) + 8,
    topo: Math.min(...tokensDoGrupo.map((tk) => tk.y - (TAMANHO_GRID / 2 - 2) * (tk.escala || 1))) - 8,
    base: Math.max(...tokensDoGrupo.map((tk) => tk.y + (TAMANHO_GRID / 2 - 2) * (tk.escala || 1))) + 8,
  } : null;

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
        quantidadeSelecionada={tokensSelecionados.length}
        onNovoToken={alternarToken}
        onCarregarMapa={handleCarregarMapa}
        onAlternarMedicao={alternarMedindo}
        onExcluirSelecionados={removerTokensSelecionados}
      />

      {janelaToken && (
        <TokenModal
          quantidade={quantTokens}
          cor={corSelecionada}
          imagem={imagemToken}
          onQuantidadeChange={setQuantTokens}
          onCorChange={setCorSelecionada}
          onImagemChange={selecionarImagemToken}
          onLimparImagem={() => setImagemToken(null)}
          onCriar={criarNovoToken}
          onFechar={alternarToken}
        />
      )}

      {/* O Palco do Konva 🎬 */}
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onWheel={handleWheel}
        onContextMenu={(e) => e.evt.preventDefault()}
        onClick={(e) => {
          // Limpa a seleção ao clicar no fundo
          if (e.target === e.target.getStage() && !medindo) {
            if (selecaoAreaConcluida.current) {
              selecaoAreaConcluida.current = false;
            } else {
              setTokensSelecionados([]);
            }
          }
        }}
        onMouseDown={(e) => {
          // Arrastar em uma área vazia cria uma seleção retangular.
          if (e.evt.button === 0 && !medindo && e.target === e.target.getStage()) {
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
            setPontoInicial(pos);
            setPontoAtual(pos);
          }
        }}
        onMouseMove={(e) => {
          if (selecaoArea) {
            const pos = e.target.getStage().getRelativePointerPosition();
            setSelecaoArea((area) => area && ({ ...area, x2: pos.x, y2: pos.y }));
          }
          if (medindo && pontoInicial) {
            const stage = e.target.getStage();
            const pos = stage.getRelativePointerPosition();
            setPontoAtual(pos);
          }
        }}
        onMouseUp={(e) => {
          if (selecaoArea && e.evt.button === 0) finalizarSelecaoArea();
          if (e.evt.button === 2) {
            const stage = e.target.getStage();
            stage.draggable(false);
          }
          if (medindo && e.evt.button === 0) {
            setPontoInicial(null);
            setPontoAtual(null);
          }
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

        {/* Camada 3: Tokens 🪙 */}
        <Layer>
          <SelectionRectangle area={selecaoArea} obterLimites={obterRetanguloSelecao} />
          <TokenGroupControls
            limites={limitesGrupo}
            visivel={!medindo}
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
              medindo={medindo}
              onSelecionar={selecionarToken}
              onDuploClique={limparSelecaoNoDuploClique}
              onArrasteInicio={handleDragStart}
              onArraste={handleDragMove}
              onArrasteFim={handleDragEnd}
            />
          ))}
        </Layer>

        {/* Camada 4: Régua de Medição 📏 */}
        <MeasurementLayer inicio={pontoInicial} atual={pontoAtual} distancia={calcularDistancia} />
      </Stage>
    </div>
  );
}
