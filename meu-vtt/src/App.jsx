import React, { useState } from 'react';
import { Stage, Layer, Line, Circle } from 'react-konva';


const TAMANHO_GRID = 50;
const LARGURA_TELA = window.innerWidth;
const ALTURA_TELA = window.innerHeight;

export default function MesaRPG() {
  // 1. OS ESTADOS (A Memória do React)
  // Guarda a lista de tokens criados
  const [tokens, setTokens] = useState([]); 
  // Controla se a janela está aberta ou fechada
  const [janelaToken, setJanelaToken] = useState(false); 
  // Guarda a cor que o usuário escolheu na janela
  const [corSelecionada, setCorSelecionada] = useState('#ff0044'); 

  // 2. FUNÇÃO: ABRIR/FECHAR JANELA
  const alternarToken = () => setJanelaToken(!janelaToken);
  
  // 3. FUNÇÃO: CRIAR TOKEN
  const criarNovoToken = () => {
    const raio = TAMANHO_GRID / 2;
    // Criamos um novo objeto com os dados do token
    const novoToken = {
      id: Date.now().toString(), // Um ID único
      x: 0 + raio, // Nasce no primeiro quadrado (canto superior esquerdo)
      y: 50 + raio,
      cor: corSelecionada,
    };
    
    // Adiciona o novo token na lista existente
    setTokens([...tokens, novoToken]); 
    // Fecha a janela após criar
    setJanelaToken(false); 
  };

  // 4. FUNÇÃO: EFEITO IMÃ (SNAP TO GRID)
  const handleDragEnd = (e, id) => {
    const raio = TAMANHO_GRID / 2;
    const circulo = e.target;
    
    const coluna = Math.floor(circulo.x() / TAMANHO_GRID);
    const linha = Math.floor(circulo.y() / TAMANHO_GRID);
    
    const xEncaixado = (coluna * TAMANHO_GRID) + raio;
    const yEncaixado = (linha * TAMANHO_GRID) + raio;
    if(xEncaixado<0){
      xEncaixado = 25;
    }else if(xEncaixado>LARGURA_TELA){
      xEncaixado = LARGURA_TELA-25;
    };
    if(yEncaixado<0 ){
      yEncaixado=25;
    }else if(yEncaixado>ALTURA_TELA){
      yEncaixado+ALTURA_TELA-25
    };
    // --- A LINHA MÁGICA QUE RESOLVE O BUG ---
    // Força o desenho do Konva a pular para o lugar certo imediatamente
    circulo.position({ x: xEncaixado, y: yEncaixado });

    // Atualiza a memória do React
    const novosTokens = tokens.map((tk) => 
      tk.id === id ? { ...tk, x: xEncaixado, y: yEncaixado } : tk
    );
    setTokens(novosTokens);
  };;

  // 5. DESENHANDO AS LINHAS DO GRID (Matemática)
  const linhasGrid = [];
  for (let i = 0; i < LARGURA_TELA / TAMANHO_GRID; i++) {
    linhasGrid.push(<Line key={`v-${i}`} points={[i * TAMANHO_GRID, 0, i * TAMANHO_GRID, ALTURA_TELA]} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />);
  }
  for (let j = 0; j < ALTURA_TELA / TAMANHO_GRID; j++) {
    linhasGrid.push(<Line key={`h-${j}`} points={[0, j * TAMANHO_GRID, LARGURA_TELA, j * TAMANHO_GRID]} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />);
  }

  
  
  
  // 6. O RENDER (O que aparece na tela)
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#1a1a1a', overflow: 'hidden' }}>
    
    {/* O botão agora flutua por cima do Canvas */}
    <button 
      onClick={alternarToken}
      style={{ 
        position: 'absolute', /* <-- Esta é a regra mágica */
        top: 20, 
        left: 20, 
        zIndex: 10, 
        padding: '10px 20px', 
        cursor: 'pointer' 
      }}
    >
      + Novo Token
    </button>

      {/* --- A JANELA (MODAL) --- */}
      {janelaToken && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'white', padding: '20px', borderRadius: '8px', zIndex: 20,
          display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 0 15px rgba(0,0,0,0.5)'
        }}>
          <h3>Criar Personagem</h3>
          
          <label>Cor do Token:</label>
          <input 
            type="color" 
            value={corSelecionada} 
            onChange={(e) => setCorSelecionada(e.target.value)} 
          />
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={criarNovoToken}>Criar</button>
            <button onClick={alternarJanela}>Cancelar</button>
          </div>
        </div>
      )}

      {/* --- O PALCO DO KONVA --- */}
      <Stage width={LARGURA_TELA} height={ALTURA_TELA} position='absolute'>
        
        {/* Camada do Grid */}
        <Layer>
          {linhasGrid}
        </Layer>

        {/* Camada dos Tokens */}
        <Layer>
          {tokens.map((tk) => (
            <Circle
              key={tk.id}
              x={tk.x}
              y={tk.y}
              radius={(TAMANHO_GRID / 2) - 2}
              fill={tk.cor}
              stroke="white"
              strokeWidth={2}
              draggable={true}
              onDragEnd={(e) => handleDragEnd(e, tk.id)}
              onMouseEnter={(e) => {
                const container = e.target.getStage().container();
                container.style.cursor = 'pointer';
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage().container();
                container.style.cursor = 'default';
              }}
            />
          ))}
        </Layer>
        
      </Stage>
    </div>
  );
}