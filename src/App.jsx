import React, { useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Text, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

const TAMANHO_GRID = 50;
const METROS_POR_QUADRADO = 1.5;

// 1. COMPONENTE AUXILIAR DO MAPA 🖼️
function MapaImagem({ url, onMapaCarregado }) {
  const [imagem] = useImage(url);

  useEffect(() => {
    if (imagem) {
      onMapaCarregado({
        largura: imagem.width,
        altura: imagem.height,
      });
    }
  }, [imagem, onMapaCarregado]);

  return <KonvaImage image={imagem} x={0} y={0} />;
}

// 2. COMPONENTE PRINCIPAL DA MESA 🚀
export default function MesaRPG() {
  // Estados da mesa 🧠
  const [tokens, setTokens] = useState([]);
  const [tokensSelecionados, setTokensSelecionados] = useState([]);
  const [posicoesIniciais, setPosicoesIniciais] = useState({});
  const [janelaToken, setJanelaToken] = useState(false);
  const [corSelecionada, setCorSelecionada] = useState('#ff0044');
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
    const raio = TAMANHO_GRID / 2;
    const novosTokens = [];
    for (let i = 0; i < quantTokens; i++) {
      novosTokens.push({
        id: `${Date.now()}-${i}`,
        x: window.innerWidth / 2 + i * 10,
        y: window.innerHeight / 2,
        cor: corSelecionada,
      });
    }
    setTokens([...tokens, ...novosTokens]);
    setJanelaToken(false);
  };

  // Exclusão de Tokens Selecionados 🗑️
  const removerTokensSelecionados = () => {
    setTokens((tokensAtuais) =>
      tokensAtuais.filter((tk) => !tokensSelecionados.includes(tk.id))
    );
    setTokensSelecionados([]);
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
    const mapaPosicoes = {};
    tokens.forEach((tk) => {
      if (tk.id === idLider || tokensSelecionados.includes(tk.id)) {
        mapaPosicoes[tk.id] = { x: tk.x, y: tk.y };
      }
    });
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
        if (tokensSelecionados.includes(tk.id)) {
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
      if (tk.id === idLider || tokensSelecionados.includes(tk.id)) {
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

  // Linhas do Grid 📐
  const linhasGrid = [];
  for (let i = 0; i < tamanhoPalco.largura / TAMANHO_GRID; i++) {
    linhasGrid.push(
      <Line
        key={`v-${i}`}
        points={[i * TAMANHO_GRID, 0, i * TAMANHO_GRID, tamanhoPalco.altura]}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={1}
      />
    );
  }
  for (let j = 0; j < tamanhoPalco.altura / TAMANHO_GRID; j++) {
    linhasGrid.push(
      <Line
        key={`h-${j}`}
        points={[0, j * TAMANHO_GRID, tamanhoPalco.largura, j * TAMANHO_GRID]}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={1}
      />
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#1a1a1a', overflow: 'hidden' }}>
      
      {/* Barra de Ferramentas Flutuante 🎛️ */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button onClick={alternarToken} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          + Novo Token
        </button>

        <label style={{ backgroundColor: '#007bff', color: 'white', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>
          🗺️ Carregar Mapa
          <input type="file" accept="image/*" onChange={handleCarregarMapa} style={{ display: 'none' }} />
        </label>

        <button 
          onClick={alternarMedindo} 
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer', 
            backgroundColor: medindo ? '#ffcc00' : '#e0e0e0', 
            color: medindo ? '#000' : '#333', 
            fontWeight: medindo ? 'bold' : 'normal',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {medindo ? '📏 Medindo...' : '📏 Medir'}
        </button>

        {tokensSelecionados.length > 0 && (
          <button 
            onClick={removerTokensSelecionados} 
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#ff4444', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            🗑️ Excluir Selecionados ({tokensSelecionados.length})
          </button>
        )}
      </div>

      {/* Modal de Criação de Token 🪟 */}
      {janelaToken && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '20px', borderRadius: '8px', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 0 15px rgba(0,0,0,0.5)' }}>
          <h3>Criar Personagem</h3>
          <label>Quantidade:</label>
          <input type="number" min="1" value={quantTokens} onChange={(e) => setQuantTokens(Number(e.target.value))} />
          <label>Cor do Token:</label>
          <input type="color" value={corSelecionada} onChange={(e) => setCorSelecionada(e.target.value)} />
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={criarNovoToken}>Criar</button>
            <button onClick={alternarToken}>Cancelar</button>
          </div>
        </div>
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
            setTokensSelecionados([]);
          }
        }}
        onMouseDown={(e) => {
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
          if (medindo && pontoInicial) {
            const stage = e.target.getStage();
            const pos = stage.getRelativePointerPosition();
            setPontoAtual(pos);
          }
        }}
        onMouseUp={(e) => {
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
        <Layer>{linhasGrid}</Layer>

        {/* Camada 3: Tokens 🪙 */}
        <Layer>
          {tokens.map((tk) => (
            <Circle
              key={tk.id}
              x={tk.x}
              y={tk.y}
              radius={TAMANHO_GRID / 2 - 2}
              fill={tk.cor}
              stroke={tokensSelecionados.includes(tk.id) ? '#ffff00' : 'white'}
              strokeWidth={tokensSelecionados.includes(tk.id) ? 4 : 2}
              draggable={!medindo}
              onClick={(e) => {
                if (!medindo) {
                  e.cancelBubble = true;
                  const comShift = e.evt.shiftKey;
                  if (comShift) {
                    setTokensSelecionados((prev) =>
                      prev.includes(tk.id)
                        ? prev.filter((id) => id !== tk.id)
                        : [...prev, tk.id]
                    );
                  } else {
                    setTokensSelecionados([tk.id]); // ✅ Corrigido tk.id
                  }
                }
              }}
              onDblClick={(e) => {
                e.cancelBubble = true;
                if (!e.evt.shiftKey) {
                  setTokensSelecionados([]);
                }
              }}
              onDragStart={(e) => handleDragStart(e, tk.id)}
              onDragMove={(e) => handleDragMove(e, tk.id)}
              onDragEnd={(e) => handleDragEnd(e, tk.id)}
              onMouseEnter={(e) => {
                e.target.getStage().container().style.cursor = 'pointer';
              }}
              onMouseLeave={(e) => {
                e.target.getStage().container().style.cursor = 'default';
              }}
            />
          ))}
        </Layer>

        {/* Camada 4: Régua de Medição 📏 */}
        {pontoInicial && pontoAtual && (
          <Layer>
            <Line
              points={[pontoInicial.x, pontoInicial.y, pontoAtual.x, pontoAtual.y]}
              stroke="#ffcc00"
              strokeWidth={3}
              dash={[10, 5]}
            />
            <Text
              x={(pontoInicial.x + pontoAtual.x) / 2}
              y={(pontoInicial.y + pontoAtual.y) / 2 - 15}
              text={`${calcularDistancia(pontoInicial, pontoAtual)} m`}
              fontSize={18}
              fill="white"
              fontStyle="bold"
            />
          </Layer>
        )}
      </Stage>
    </div>
  );
}