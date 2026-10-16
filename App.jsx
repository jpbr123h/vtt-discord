import React, { useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Text, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

const TAMANHO_GRID = 50;

// 1. COMPONENTE AUXILIAR DO MAPA (Fica do lado de fora) 🖼️
function MapaImagem({ url, onMapaCarregado }) {
  const [imagem] = useImage(url);

  useEffect(() => {
    if (imagem) {
      onMapaCarregado({
        largura: imagem.width,
        altura: imagem.height,
      });
    }
  }, [imagem]); // 👈 Dispara apenas quando a imagem é carregada

  return <KonvaImage image={imagem} x={0} y={0} />;
}

// 2. COMPONENTE PRINCIPAL DA MESA 🚀
export default function MesaRPG() {
  // Estados de controle 🧠
  const [tokens, setTokens] = useState([]);
  const [janelaToken, setJanelaToken] = useState(false);
  const [corSelecionada, setCorSelecionada] = useState('#ff0044');
  const [quantTokens, setQuantTokens] = useState(1);
  const [tokensSelecionados, setTokensSelecionados] = useState([]);
  const [urlMapa, setUrlMapa] = useState(null);
  // medicao
  const [pontoInicial, setPontoInicial] = useState(null);
  const [pontoAtual, setPontoAtual] = useState(null);
  const [medindo, setMedindo] = useState(false);
  const alternarMedindo = () => {setMedindo(!medindo); setPontoInicial(null); tokensSelecionados([])};
  // Estado para o tamanho do palco 📐
  const [tamanhoPalco, setTamanhoPalco] = useState({
    largura: window.innerWidth,
    altura: window.innerHeight,
  });

  // Funções da Janela e Tokens 🪙
  const alternarToken = () => setJanelaToken(!janelaToken);

  const criarNovoToken = () => {
    const raio = TAMANHO_GRID / 2;
    const novosTokens = [];
    for (let i = 0; i < quantTokens; i++) {
      novosTokens.push({
        id: `${Date.now()}-${i}`,
        x: window.innerWidth/2,
        y: window.innerHeight/2,
        cor: corSelecionada,
      });
    }
    setTokens([...tokens, ...novosTokens]);
    setJanelaToken(false);
  };

  // Efeito Ímã (Snap to Grid) 🧲
  const handleDragEnd = (e, id) => {
    const raio = TAMANHO_GRID / 2;
    const circulo = e.target;

    const coluna = Math.floor(circulo.x() / TAMANHO_GRID);
    const linha = Math.floor(circulo.y() / TAMANHO_GRID);

    let xEncaixado = coluna * TAMANHO_GRID + raio;
    let yEncaixado = linha * TAMANHO_GRID + raio;

    // Limites da tela/palco
    if (xEncaixado < raio) xEncaixado = raio;
    if (xEncaixado > tamanhoPalco.largura) xEncaixado = tamanhoPalco.largura - raio;
    if (yEncaixado < raio) yEncaixado = raio;
    if (yEncaixado > tamanhoPalco.altura) yEncaixado = tamanhoPalco.altura - raio;

    circulo.position({ x: xEncaixado, y: yEncaixado });

    const novosTokens = tokens.map((tk) =>
      tk.id === id ? { ...tk, x: xEncaixado, y: yEncaixado } : tk
    );
    setTokens(novosTokens);
  };

  // Remoção de Tokens por Tecla e Seleção 🗑️
  const removerTokenSelecionado = () => {
    if (!idTokenSelecionado) return;
    setTokens(tokens.filter((tk) => tk.id !== idTokenSelecionado));
    setIdTokenSelecionado(null);
  };

  useEffect(() => {
    const tratarTeclas = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        removerTokenSelecionado();
      }
    };
    window.addEventListener('keydown', tratarTeclas);
    return () => window.removeEventListener('keydown', tratarTeclas);
  }, [tokensSelecionados, tokens]);

  // Leitura do Arquivo de Mapa 📂
  const handleCarregarMapa = (e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
      const url = URL.createObjectURL(arquivo);
      setUrlMapa(url);
    }
  };

  const handleMapaCarregado = useCallback(({ largura, altura }) => {
    setTamanhoPalco({ largura, altura });
  }, []); // 👈 O array vazio [] garante que a função só é criada uma vez

  // Controle de Zoom 🔍
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

  // Desenho das Linhas do Grid 📐
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
  const METROS_POR_QUADRADO = 1.5;

  const calcularDistancia = (ponto1, ponto2) => {
    if (!ponto1 || !ponto2) return 0;

    // 1. Diferença de coordenadas em pixels 📍
    const dx = ponto2.x - ponto1.x;
    const dy = ponto2.y - ponto1.y;

    // 2. Distância total em pixels (Teorema de Pitágoras) 📐
    const distanciaEmPixels = Math.sqrt(dx * dx + dy * dy);

    // 3. Converter de pixels para quadrados do grid 🔲
    const quantidadeQuadrados = distanciaEmPixels / TAMANHO_GRID;

    // 4. Converter quadrados para metros 📏
    const distanciaEmMetros = quantidadeQuadrados * METROS_POR_QUADRADO;

    // Retorna o valor arredondado para 1 casa decimal (ex: 4.5 m)
    return distanciaEmMetros.toFixed(1);
  };

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
        <button onClick={alternarMedindo}style={{ padding: '10px 20px', cursor: 'pointer' }}>Medir</button>
        

        {tokensSelecionados && (
          <button onClick={removerTokenSelecionado} style={{ padding: '10px 20px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            🗑️ Excluir Selecionado
          </button>
        )}
      </div>

      {/* Modal de Criação de Token 🪟 */}
      {janelaToken && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '20px', borderRadius: '8px', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 0 15px rgba(0,0,0,0.5)' }}>
          <h3>Criar Personagem</h3>
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
        onMouseDown={(e) => {
          if (e.evt.button === 2) {
            const stage = e.target.getStage();
            stage.draggable(true);
            stage.startDrag();
          }
          if (medindo && e.evt.button === 0) {
            const stage = e.target.getStage();
            const pos = stage.getRelativePointerPosition(); // 📍 Pega X e Y reais no mapa
            
            setPontoInicial(pos);
            setPontoAtual(pos);
          }
        }}
        onMouseUp={(e) => {
          if (e.evt.button === 2) {
            const stage = e.target.getStage();
            stage.draggable(false);
          }
          if (medindo && e.evt.button === 0) {
            
            // Aqui você pode manter a linha visível ou limpá-la:
            setPontoInicial(null);
            setPontoAtual(null);
          }
        }}

        onMouseMove={(e) => {
          // Enquanto movemos o mouse com o botão pressionado
          if (medindo && pontoInicial) {
            const stage = e.target.getStage();
            const pos = stage.getRelativePointerPosition();
            
            setPontoAtual(pos); // Atualiza a ponta da linha em tempo real ✏️
          }
        }}
      >
        {/* Camada 1: Imagem do Mapa 🖼️ */}
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
                if(!medindo){
                  
                    const comShift = e.evt.shiftKey; // Verifica se o Shift está pressionado ⌨️
                    e.cancelBubble = true;
                    if (comShift) {
                      setTokensSelecionados((prev) =>
                        prev.includes(tk.id)
                          ? prev.filter((id) => id !== tk.id)
                          : [...prev, tk.id]
                      );
                    } else {
                      // Seleção única normal
                      setTokensSelecionados([id]);
                    }
                  
                }
              }}
              onDblClick={(e) => {
                e.cancelBubble = true;
                const comShift = e.evt.shiftKey;
                  if (!comShift) {
                    setTokensSelecionados([]); // Limpa toda a seleção
                  }
              }}
              onDragEnd={(e) => {
                
                  handleDragEnd(e, tk.id)
          
              }}
              onMouseEnter={(e) => {
                e.target.getStage().container().style.cursor = 'pointer';
              }}
              onMouseLeave={(e) => {
                e.target.getStage().container().style.cursor = 'default';
              }}
            />
          ))}
        </Layer>
        {pontoInicial && pontoAtual && (
          <Layer>
            {/* Linha da Régua ✏️ */}
            <Line
              points={[pontoInicial.x, pontoInicial.y, pontoAtual.x, pontoAtual.y]}
              stroke="#ffcc00"
              strokeWidth={3}
              dash={[10, 5]} // Deixa a linha tracejada!
            />
            
            {/* Texto com a Medida 🏷️ */}
            <Text
              x={(pontoInicial.x + pontoAtual.x) / 2} // Posiciona no meio da linha
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