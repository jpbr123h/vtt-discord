import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Stage, Layer, Line, Text, Rect, Group, Ellipse } from 'react-konva';
import { ArrowLeft, Users, Eye } from 'lucide-react';
import { doc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../auth/firebase.js';
import { excluirAnotacao, salvarAnotacao, salvarToken } from '../services/mesa.js';
import MapaImagem from '../components/MapaImagem';
import TokenNode from '../components/TokenNode';
import GridLayer from '../components/GridLayer';
import { Button } from '../components/ui/button.jsx';
import './playerview.css';

const TAMANHO_GRID = 50;
const ESCALA_MINIMA = 0.2;
const ESCALA_MAXIMA = 4;

export default function PlayerView() {
  const { sessaoId } = useParams();
  const navigate = useNavigate();
  const stageRef = useRef(null);
  const tokenNodeRefs = useRef(new Map());
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tokens, setTokens] = useState([]);
  const [anotacoes, setAnotacoes] = useState([]);
  const [urlMapa, setUrlMapa] = useState(null);
  const [tamanhoPalco, setTamanhoPalco] = useState({ largura: window.innerWidth, altura: window.innerHeight });
  const [menuNota, setMenuNota] = useState(null);
  const anotacaoRefs = useRef(new Map());
  const panRef = useRef(null);
  const panMoveuRef = useRef(false);

  useEffect(() => {
    const carregarSessao = async () => {
      if (!db || !sessaoId) {
        setErro('Sessão inválida.');
        setCarregando(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'sessoes', sessaoId));
        if (!snap.exists()) {
          setErro('Sessão não encontrada.');
          setCarregando(false);
          return;
        }
        setSessao({ id: snap.id, ...snap.data() });
      } catch (e) {
        console.error(e);
        setErro('Erro ao carregar sessão.');
      } finally {
        setCarregando(false);
      }
    };
    carregarSessao();
  }, [sessaoId]);

  useEffect(() => {
    if (!db || !sessaoId) return;
    const unsubTokens = onSnapshot(collection(db, 'sessoes', sessaoId, 'tokens'), (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTokens(lista);
    }, (err) => {
      console.error('Erro ao ouvir tokens:', err);
    });
    const unsubMapa = onSnapshot(doc(db, 'sessoes', sessaoId, 'estado', 'mapa'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.url) setUrlMapa(data.url);
        if (data.largura && data.altura) {
          setTamanhoPalco({ largura: data.largura, altura: data.altura });
        }
      } else {
        setUrlMapa(null);
      }
    }, (err) => {
      console.error('Erro ao ouvir mapa:', err);
    });
    const unsubAnotacoes = onSnapshot(collection(db, 'sessoes', sessaoId, 'anotacoes'), (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAnotacoes(lista);
    }, (err) => {
      console.error('Erro ao ouvir anotações:', err);
    });
    return () => {
      unsubTokens();
      unsubMapa();
      unsubAnotacoes();
    };
  }, [sessaoId]);

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const escalaAntiga = stage.scaleX();
    const ponteiro = stage.getPointerPosition();
    if (!ponteiro) return;
    const fatorZoom = 1.05;
    const desejada = e.evt.deltaY < 0 ? escalaAntiga * fatorZoom : escalaAntiga / fatorZoom;
    const novaEscala = Math.min(ESCALA_MAXIMA, Math.max(ESCALA_MINIMA, desejada));
    if (novaEscala === escalaAntiga) return;
    stage.scale({ x: novaEscala, y: novaEscala });
    const novaPosicao = {
      x: ponteiro.x - (ponteiro.x - stage.x()) * (novaEscala / escalaAntiga),
      y: ponteiro.y - (ponteiro.y - stage.y()) * (novaEscala / escalaAntiga),
    };
    stage.position(novaPosicao);
  };

  useEffect(() => {
    const onResize = () => {
      setTamanhoPalco({ largura: window.innerWidth, altura: window.innerHeight - 64 });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Garante que o pan termine mesmo se o botão for solto fora do palco.
  useEffect(() => {
    const pararPan = (evento) => {
      if (evento.button !== 2 || !panRef.current) return;
      panRef.current = null;
      const stage = stageRef.current;
      if (stage) stage.container().style.cursor = 'default';
    };
    window.addEventListener('mouseup', pararPan);
    return () => window.removeEventListener('mouseup', pararPan);
  }, []);

  if (carregando) {
    return (
      <div className="playerview-page playerview-page--center">
        <p>Carregando mesa...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="playerview-page playerview-page--center">
        <div className="playerview-error">
          <p>{erro}</p>
          <Button variant="outline" onClick={() => navigate('/sessoes')}><ArrowLeft size={16} /> Voltar para sessões</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="playerview-page">
      <header className="playerview-header">
        <button className="playerview-back" onClick={() => navigate('/sessoes')}>
          <ArrowLeft size={17} /> Voltar
        </button>
        <div className="playerview-title">
          <Eye size={18} />
          <div>
            <strong>{sessao?.nome || 'Mesa'}</strong>
            <span>Visão do jogador</span>
          </div>
        </div>
        <div className="playerview-meta">
          <Users size={16} />
          <span>{tokens.length} token{tokens.length === 1 ? '' : 's'}</span>
        </div>
      </header>
      <Stage
        ref={stageRef}
        width={tamanhoPalco.largura}
        height={tamanhoPalco.altura}
        y={64}
        onWheel={handleWheel}
        onContextMenu={(e) => e.evt.preventDefault()}
        draggable={false}
        onMouseDown={(e) => {
          if (e.evt.button === 2) {
            const stage = stageRef.current;
            if (stage) {
              panMoveuRef.current = false;
              panRef.current = {
                clientX: e.evt.clientX,
                clientY: e.evt.clientY,
                stageX: stage.x(),
                stageY: stage.y(),
              };
              stage.container().style.cursor = 'grabbing';
            }
          }
        }}
        onMouseMove={(e) => {
          if (!panRef.current) return;
          const stage = stageRef.current;
          if (!stage) return;
          const deltaX = e.evt.clientX - panRef.current.clientX;
          const deltaY = e.evt.clientY - panRef.current.clientY;
          if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
            panMoveuRef.current = true;
            panRef.current.moveu = true;
            setMenuNota(null);
          }
          stage.position({
            x: panRef.current.stageX + deltaX,
            y: panRef.current.stageY + deltaY,
          });
          stage.batchDraw();
        }}
        onMouseUp={(e) => {
          if (e.evt.button === 2 && panRef.current) {
            panRef.current = null;
            const stage = stageRef.current;
            if (stage) stage.container().style.cursor = 'default';
          }
        }}
      >
        <Layer>
          {urlMapa ? <MapaImagem url={urlMapa} onMapaCarregado={({ largura, altura }) => setTamanhoPalco((atual) => {
            const novo = { largura: Math.max(largura, atual.largura), altura: Math.max(altura, atual.altura) };
            if (novo.largura === atual.largura && novo.altura === atual.altura) return atual;
            return novo;
          })} /> : null}
        </Layer>
        <GridLayer largura={tamanhoPalco.largura} altura={tamanhoPalco.altura} tamanhoCelula={TAMANHO_GRID} />
        <Layer>
          {anotacoes.map((item) => item.tipo === 'traco' ? (
            <Line
              key={item.id}
              ref={(node) => { if (node) anotacaoRefs.current.set(item.id, node); else anotacaoRefs.current.delete(item.id); }}
              points={item.pontos}
              stroke={item.cor}
              strokeWidth={item.espessura}
              x={item.offsetX || 0}
              y={item.offsetY || 0}
              draggable
              lineCap="round"
              lineJoin="round"
              onDragEnd={(e) => {
                const nova = { ...item, offsetX: e.target.x(), offsetY: e.target.y() };
                setAnotacoes((atuais) => atuais.map((a) => (a.id === item.id ? nova : a)));
                salvarAnotacao(sessaoId, nova);
              }}
            />
          ) : item.tipo === 'forma' ? (
            <Group
              key={item.id}
              ref={(node) => { if (node) anotacaoRefs.current.set(item.id, node); else anotacaoRefs.current.delete(item.id); }}
              x={item.x}
              y={item.y}
              draggable
              onDragEnd={(e) => {
                const nova = { ...item, x: e.target.x(), y: e.target.y() };
                setAnotacoes((atuais) => atuais.map((a) => (a.id === item.id ? nova : a)));
                salvarAnotacao(sessaoId, nova);
              }}
            >
              {item.forma === 'circulo' ? (
                <Ellipse x={item.largura / 2} y={item.altura / 2} radiusX={item.largura / 2} radiusY={item.altura / 2} stroke={item.cor} strokeWidth={item.espessura} />
              ) : item.forma === 'quadrado' || item.forma === 'retangulo' ? (
                <Rect width={item.largura} height={item.altura} stroke={item.cor} strokeWidth={item.espessura} />
              ) : (
                <Line points={item.pontos} closed={item.forma === 'triangulo' || item.forma === 'estrela'} fill="rgba(0,0,0,0)" stroke={item.cor} strokeWidth={item.espessura} lineCap="round" lineJoin="round" />
              )}
            </Group>
          ) : item.tipo === 'texto' ? (
            <Group
              key={item.id}
              ref={(node) => { if (node) anotacaoRefs.current.set(item.id, node); else anotacaoRefs.current.delete(item.id); }}
              x={item.x}
              y={item.y}
              draggable
              onDragEnd={(e) => {
                const nova = { ...item, x: e.target.x(), y: e.target.y() };
                setAnotacoes((atuais) => atuais.map((a) => (a.id === item.id ? nova : a)));
                salvarAnotacao(sessaoId, nova);
              }}
              onContextMenu={(e) => {
                e.evt.preventDefault();
                if (panMoveuRef.current) {
                  panMoveuRef.current = false;
                  return;
                }
                setMenuNota({
                  id: item.id,
                  x: Math.min(e.evt.clientX + 10, window.innerWidth - 200),
                  y: Math.min(e.evt.clientY + 10, window.innerHeight - 180),
                });
              }}
            >
              <Rect width={item.boxWidth || 200} height={item.boxHeight || 60} fill="rgba(12, 16, 24, 0)" stroke="rgba(255,255,255,0.28)" strokeWidth={1} cornerRadius={6} />
              <Text x={8} y={6} width={(item.boxWidth || 200) - 16} height={(item.boxHeight || 60) - 12} text={item.texto} fill={item.cor} fontSize={item.fontSize || 20} fontStyle="bold" fontFamily={item.fontFamily || 'Arial, sans-serif'} wrap="word" shadowColor="black" shadowBlur={2} shadowOpacity={0.5} />
            </Group>
          ) : null)}
        </Layer>
        <Layer>
          {tokens.map((tk) => (
            <TokenNode
              key={tk.id}
              ref={(node) => { if (node) tokenNodeRefs.current.set(tk.id, node); else tokenNodeRefs.current.delete(tk.id); }}
              token={tk}
              raio={TAMANHO_GRID / 2 - 2}
              selecionado={false}
              medindo={false}
              ferramenta="selecionar"
              onSelecionar={() => {}}
              onDuploClique={() => {}}
              onArrasteInicio={() => {}}
              onArraste={() => {}}
              onArrasteFim={(e) => {
                const circulo = e.target;
                const raio = TAMANHO_GRID / 2;
                const coluna = Math.floor(circulo.x() / TAMANHO_GRID);
                const linha = Math.floor(circulo.y() / TAMANHO_GRID);
                let xNovo = coluna * TAMANHO_GRID + raio;
                let yNovo = linha * TAMANHO_GRID + raio;
                if (xNovo < raio) xNovo = raio;
                if (xNovo > tamanhoPalco.largura - raio) xNovo = tamanhoPalco.largura - raio;
                if (yNovo < raio) yNovo = raio;
                if (yNovo > tamanhoPalco.altura - raio) yNovo = tamanhoPalco.altura - raio;
                circulo.position({ x: xNovo, y: yNovo });
                tokenNodeRefs.current.get(tk.id)?.moverPara(xNovo, yNovo);
                const novoToken = { ...tk, x: xNovo, y: yNovo };
                setTokens((atuais) => atuais.map((item) => (item.id === tk.id ? novoToken : item)));
                salvarToken(sessaoId, novoToken);
              }}
              onMenuContexto={() => {}}
            />
          ))}
        </Layer>
      </Stage>
      {menuNota && (() => {
        const nota = anotacoes.find((a) => a.id === menuNota.id && a.tipo === 'texto');
        if (!nota) return null;
        const atualizarNota = (alteracoes) => {
          const nova = { ...nota, ...alteracoes };
          setAnotacoes((atuais) => atuais.map((a) => (a.id === nota.id ? nova : a)));
          salvarAnotacao(sessaoId, nova);
        };
        const fechar = () => setMenuNota(null);
        return (
          <div className="token-contextual" style={{ left: menuNota.x, top: menuNota.y }} onMouseDown={(e) => e.stopPropagation()}>
            <strong>Nota</strong>
            <label className="token-contextual__cor">Cor <input type="color" value={nota.cor || '#ffffff'} onChange={(e) => atualizarNota({ cor: e.target.value })} /></label>
            <button onClick={() => { atualizarNota({ fontSize: Math.min(60, (nota.fontSize || 20) + 2) }); fechar(); }}>Aumentar fonte</button>
            <button onClick={() => { atualizarNota({ fontSize: Math.max(10, (nota.fontSize || 20) - 2) }); fechar(); }}>Diminuir fonte</button>
            <button className="token-contextual__excluir" onClick={() => {
              setAnotacoes((atuais) => atuais.filter((a) => a.id !== nota.id));
              excluirAnotacao(sessaoId, nota.id);
              fechar();
            }}>Apagar nota</button>
          </div>
        );
      })()}
    </div>
  );
}
