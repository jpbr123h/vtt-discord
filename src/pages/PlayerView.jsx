import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Stage, Layer, Line, Text, Rect, Group, Ellipse } from 'react-konva';
import { ArrowLeft, Users, Eye, Plus, X, Pencil, Type, MousePointer2, EyeOff } from 'lucide-react';
import { doc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext.jsx';
import { db } from '../auth/firebase.js';
import { excluirAnotacao, salvarAnotacao, salvarToken } from '../services/mesa.js';
import { obterPermissoes, podeEditarAnotacao } from '../utils/permissoes.js';
import ImageAnnotation from '../components/ImageAnnotation';
import useColarNoMapa from '../hooks/useColarNoMapa';
import DrawingPreview from '../components/DrawingPreview';
import CanvasTextEditor from '../components/CanvasTextEditor';
import { novoId } from '../utils/id.js';
import MapaImagem from '../components/MapaImagem';
import TokenNode from '../components/TokenNode';
import GridLayer from '../components/GridLayer';
import WeatherLayer from '../components/WeatherLayer';
import useMovimentosRealtime from '../hooks/useMovimentosRealtime';
import useClima from '../hooks/useClima';
import FogLayer from '../components/FogLayer';
import { Button } from '../components/ui/button.jsx';
import './playerview.css';

const TAMANHO_GRID = 50;
const ESCALA_MINIMA = 0.2;
const ESCALA_MAXIMA = 4;

export default function PlayerView() {
  const { sessaoId } = useParams();
  const { user } = useAuth();
  return <PlayerMesa key={`${sessaoId}_${user?.uid}`} />;
}

function PlayerMesa() {
  const { sessaoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const stageRef = useRef(null);
  const tokenNodeRefs = useRef(new Map());
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tokens, setTokens] = useState([]);
  const [anotacoes, setAnotacoes] = useState([]);
  const [urlMapa, setUrlMapa] = useState(null);
  const [erroMapaImagem, setErroMapaImagem] = useState(false);
  const [mapaImagemCarregado, setMapaImagemCarregado] = useState(false);
  const [nevoa, setNevoa] = useState({ ativo: false, celulas: {} });
  const [permissoes, setPermissoes] = useState(() => obterPermissoes(null));
  const { transmitir: transmitirMovimento, concluir: concluirMovimento, receber: receberMovimento, cancelar: cancelarMovimento, erro: erroMovimento } = useMovimentosRealtime(sessaoId);
  const { areas: areasClima } = useClima(sessaoId, permissoes.podeVerMapa);
  const [ferramenta, setFerramenta] = useState('selecionar');
  const [cor, setCor] = useState('#ffcc00');
  const [espessura, setEspessura] = useState(5);
  const [editorTexto, setEditorTexto] = useState(null);
  const [erroAnotacao, setErroAnotacao] = useState('');
  const tracoRef = useRef(null);
  const previewRef = useRef(null);
  const [modoColocarToken, setModoColocarToken] = useState(false);
  const [tamanhoPalco, setTamanhoPalco] = useState({ largura: window.innerWidth, altura: window.innerHeight });
  const [tamanhoTela, setTamanhoTela] = useState({ largura: window.innerWidth, altura: window.innerHeight });
  const [menuNota, setMenuNota] = useState(null);
  const anotacaoRefs = useRef(new Map());
  const panRef = useRef(null);
  const panMoveuRef = useRef(false);
  const mapaAjustadoRef = useRef(null);

  const colando = useColarNoMapa({
    stageRef, tamanhoPalco, sessaoId, usuarioId: user?.uid,
    habilitado: permissoes.podeAnotar, bloqueado: Boolean(editorTexto || carregando),
    cor, onErro: setErroAnotacao,
    validarPosicao: (pos) => {
      if (!nevoa.ativo) return true;
      return nevoa.celulas?.[`${Math.floor(pos.x / TAMANHO_GRID)},${Math.floor(pos.y / TAMANHO_GRID)}`] === 0;
    },
    onColar: async (item, aindaPermitido) => {
      if (!await salvarAnotacao(sessaoId, item)) throw new Error('Não foi possível salvar o item colado. Tente novamente.');
      if (!aindaPermitido()) return;
      setAnotacoes((atuais) => [...atuais.filter((atual) => atual.id !== item.id), item]);
      setFerramenta('selecionar');
      setModoColocarToken(false);
    },
  });

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
    if (!db || !sessaoId || !permissoes.podeVerMapa) return;
    const unsubTokens = onSnapshot(collection(db, 'sessoes', sessaoId, 'tokens'), (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTokens(receberMovimento('tokens', lista));
    }, (err) => {
      console.error('Erro ao ouvir tokens:', err);
    });
    const unsubMapa = onSnapshot(doc(db, 'sessoes', sessaoId, 'estado', 'mapa'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.url) {
          if (data.url !== mapaAjustadoRef.current) {
            mapaAjustadoRef.current = null;
            setMapaImagemCarregado(false);
          }
          setErroMapaImagem(false);
          setUrlMapa(data.url);
        }
      } else {
        setUrlMapa(null);
      }
    }, (err) => {
      console.error('Erro ao ouvir mapa:', err);
    });
    const unsubAnotacoes = onSnapshot(collection(db, 'sessoes', sessaoId, 'anotacoes'), (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAnotacoes(receberMovimento('anotacoes', lista));
    }, (err) => {
      console.error('Erro ao ouvir anotações:', err);
    });
    const unsubNevoa = onSnapshot(doc(db, 'sessoes', sessaoId, 'estado', 'fog'), (snap) => {
      if (!snap.exists()) {
        setNevoa({ ativo: false, celulas: {} });
        return;
      }
      const data = snap.data();
      setNevoa({ ativo: Boolean(data.ativo), celulas: data.celulas || {} });
    }, (err) => {
      console.error('Erro ao ouvir névoa:', err);
    });
    return () => {
      unsubTokens();
      unsubMapa();
      unsubAnotacoes();
      unsubNevoa();
    };
  }, [sessaoId, permissoes.podeVerMapa, receberMovimento]);

  useEffect(() => {
    if (!db || !sessaoId || !user?.uid) {
      setPermissoes(obterPermissoes(null));
      return undefined;
    }
    return onSnapshot(doc(db, 'sessoesMembros', `${sessaoId}_${user.uid}`), (snap) => {
      setPermissoes(obterPermissoes(snap.exists() ? snap.data() : null));
    }, (err) => {
      console.error('Erro ao carregar permissões:', err);
      setPermissoes(obterPermissoes(null));
    });
  }, [sessaoId, user?.uid]);

  useEffect(() => {
    if (!permissoes.podeAdicionar) setModoColocarToken(false);
  }, [permissoes.podeAdicionar]);

  useEffect(() => {
    if (!permissoes.podeAnotar) {
      setFerramenta('selecionar');
      setEditorTexto(null);
      setMenuNota(null);
      tracoRef.current = null;
      previewRef.current?.clear();
    }
    if (!permissoes.podeVerMapa) {
      setTokens([]);
      setAnotacoes([]);
      setUrlMapa(null);
      setMapaImagemCarregado(false);
      mapaAjustadoRef.current = null;
      panRef.current = null;
    }
  }, [permissoes.podeAnotar, permissoes.podeVerMapa]);

  useEffect(() => {
    const finalizar = async (e) => {
      if (e.button !== 0 || !tracoRef.current) return;
      const traco = tracoRef.current;
      tracoRef.current = null;
      previewRef.current?.clear();
      if (!permissoes.podeAnotar || traco.pontos.length < 4) return;
      setErroAnotacao('');
      if (await salvarAnotacao(sessaoId, traco)) {
        setAnotacoes((atuais) => [...atuais.filter((item) => item.id !== traco.id), traco]);
      } else setErroAnotacao('Não foi possível salvar o desenho. Tente novamente.');
    };
    const cancelar = (e) => {
      if (e.type === 'blur' || e.key === 'Escape') {
        tracoRef.current = null;
        previewRef.current?.clear();
        setModoColocarToken(false);
      }
    };
    window.addEventListener('mouseup', finalizar);
    window.addEventListener('keydown', cancelar);
    window.addEventListener('blur', cancelar);
    return () => {
      window.removeEventListener('mouseup', finalizar);
      window.removeEventListener('keydown', cancelar);
      window.removeEventListener('blur', cancelar);
    };
  }, [permissoes.podeAnotar, sessaoId]);

  useEffect(() => {
    cancelarMovimento();
  }, [permissoes.podeMover, permissoes.podeAnotar, permissoes.podeVerMapa, cancelarMovimento]);

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
      setTamanhoTela({ largura: window.innerWidth, altura: window.innerHeight });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Enquadra o mapa inteiro abaixo do cabeçalho na primeira carga (e se o mapa mudar).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !urlMapa || !mapaImagemCarregado || !tamanhoPalco.largura || !tamanhoPalco.altura) return;
    if (mapaAjustadoRef.current === urlMapa) return;
    const larguraVisivel = Math.max(320, window.innerWidth);
    const alturaVisivel = Math.max(240, window.innerHeight - 64);
    const escala = Math.min(1, larguraVisivel / tamanhoPalco.largura, alturaVisivel / tamanhoPalco.altura);
    stage.scale({ x: escala, y: escala });
    stage.position({
      x: (larguraVisivel - tamanhoPalco.largura * escala) / 2,
      y: 64 + (alturaVisivel - tamanhoPalco.altura * escala) / 2,
    });
    stage.batchDraw();
    mapaAjustadoRef.current = urlMapa;
  }, [urlMapa, mapaImagemCarregado, tamanhoPalco]);

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

  // Token escondido pela névoa: fica sem interação (não dá para arrastar às cegas).
  const tokenSobNevoa = (token) => {
    if (!nevoa.ativo) return false;
    const coluna = Math.floor(token.x / TAMANHO_GRID);
    const linha = Math.floor(token.y / TAMANHO_GRID);
    const valor = nevoa.celulas?.[`${coluna},${linha}`];
    return valor === undefined ? true : Number(valor) > 0;
  };

  const colocarTokenNoMapa = (e) => {
    if (!modoColocarToken || !permissoes.podeAdicionar || e.target !== e.target.getStage()) return;
    const stage = e.target.getStage();
    const ponteiro = stage.getRelativePointerPosition();
    if (!ponteiro) return;
    const raio = TAMANHO_GRID / 2;
    const x = Math.max(raio, Math.min(tamanhoPalco.largura - raio, Math.floor(ponteiro.x / TAMANHO_GRID) * TAMANHO_GRID + raio));
    const y = Math.max(raio, Math.min(tamanhoPalco.altura - raio, Math.floor(ponteiro.y / TAMANHO_GRID) * TAMANHO_GRID + raio));
    if (tokenSobNevoa({ x, y })) return;
    const token = {
      id: novoId(),
      x,
      y,
      cor: '#7c3aed',
      imagem: null,
      nome: user?.displayName || user?.email?.split('@')[0] || 'Personagem',
      vida: 0,
      vidamax: 0,
      donoId: user.uid,
    };
    setTokens((atuais) => [...atuais, token]);
    salvarToken(sessaoId, token);
    setModoColocarToken(false);
  };

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
          {permissoes.podeVerMapa && <span>{tokens.length} token{tokens.length === 1 ? '' : 's'}</span>}
          {permissoes.podeAdicionar && (
            <Button size="sm" variant={modoColocarToken ? 'secondary' : 'outline'} onClick={() => { setFerramenta('selecionar'); setEditorTexto(null); setModoColocarToken((ativo) => !ativo); }}>
              {modoColocarToken ? <X size={15} /> : <Plus size={15} />}
              {modoColocarToken ? 'Cancelar' : 'Colocar personagem'}
            </Button>
          )}
        </div>
      </header>
      {permissoes.podeAnotar && <div className="playerview-anotacoes" role="toolbar" aria-label="Escrever e desenhar no mapa">
        {[['selecionar', 'Selecionar', MousePointer2], ['desenhar', 'Desenhar', Pencil], ['texto', 'Escrever', Type]].map(([id, nome, Icone]) =>
          <button key={id} type="button" aria-label={nome} title={nome} aria-pressed={ferramenta === id}
            onClick={() => { setFerramenta(id); setModoColocarToken(false); setEditorTexto(null); tracoRef.current = null; previewRef.current?.clear(); }}><Icone size={18} /><span>{nome}</span></button>)}
        <label>Cor<input type="color" value={cor} onChange={(e) => setCor(e.target.value)} /></label>
        {ferramenta === 'desenhar' && <label>Traço<select value={espessura} onChange={(e) => setEspessura(Number(e.target.value))}><option value={2}>Fino</option><option value={5}>Médio</option><option value={10}>Grosso</option></select></label>}
      </div>}
      {modoColocarToken && <p className="playerview-placement-hint" role="status">Clique em uma célula vazia para colocar seu personagem.</p>}
      {!permissoes.podeVerMapa && <div className="playerview-bloqueado" role="status"><EyeOff size={30} /><h2>Mapa indisponível</h2><p>O mestre pode liberar seu acesso pelo painel de jogadores.</p></div>}
      {permissoes.podeVerMapa && <Stage
        ref={stageRef}
        width={tamanhoTela.largura}
        height={tamanhoTela.altura}
        onWheel={handleWheel}
        onClick={colocarTokenNoMapa}
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
            return;
          }
          if (e.evt.button !== 0 || !permissoes.podeAnotar || ferramenta === 'selecionar' || editorTexto) return;
          const pos = stageRef.current.getRelativePointerPosition();
          if (!pos || tokenSobNevoa(pos)) return;
          setErroAnotacao('');
          if (ferramenta === 'desenhar') {
            tracoRef.current = { id: novoId(), tipo: 'traco', pontos: [pos.x, pos.y], cor, espessura, autorId: user.uid };
            previewRef.current?.update(tracoRef.current);
          } else if (ferramenta === 'texto') {
            e.evt.preventDefault();
            setEditorTexto({ id: novoId(), tipo: 'texto', x: pos.x, y: pos.y, texto: '', cor, fontSize: 20, fontFamily: 'Arial, sans-serif', boxWidth: 220, boxHeight: 72, autorId: user.uid });
          }
        }}
        onMouseMove={(e) => {
          if (tracoRef.current && permissoes.podeAnotar) {
            const pos = stageRef.current.getRelativePointerPosition();
            if (pos && !tokenSobNevoa(pos)) {
              const traco = tracoRef.current;
              const pontos = traco.pontos;
              if (Math.hypot(pos.x - pontos[pontos.length - 2], pos.y - pontos[pontos.length - 1]) >= 1.5) {
                traco.pontos = [...pontos, pos.x, pos.y];
                previewRef.current?.update(traco);
              }
            }
          }
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
          {urlMapa ? <MapaImagem url={urlMapa} onErro={() => setErroMapaImagem(true)} onMapaCarregado={({ largura, altura }) => {
            setTamanhoPalco((atual) => (atual.largura === largura && atual.altura === altura ? atual : { largura, altura }));
            setMapaImagemCarregado(true);
          }} /> : null}
        </Layer>
        <Layer listening={ferramenta === 'selecionar'}>
          {anotacoes.map((item) => item.tipo === 'traco' ? (
            <Line
              key={item.id}
              ref={(node) => { if (node) anotacaoRefs.current.set(item.id, node); else anotacaoRefs.current.delete(item.id); }}
              points={item.pontos}
              stroke={item.cor}
              strokeWidth={item.espessura}
              x={item.offsetX || 0}
              y={item.offsetY || 0}
              draggable={podeEditarAnotacao(permissoes, item, user?.uid)}
              lineCap="round"
              lineJoin="round"
              onDragMove={(e) => {
                if (!podeEditarAnotacao(permissoes, item, user?.uid)) return;
                transmitirMovimento([], [item.tipo === 'traco'
                  ? { id: item.id, tipo: item.tipo, offsetX: e.target.x(), offsetY: e.target.y() }
                  : { id: item.id, x: e.target.x(), y: e.target.y() }]);
              }}
              onDragEnd={(e) => {
                if (!podeEditarAnotacao(permissoes, item, user?.uid)) return;
                const nova = { ...item, offsetX: e.target.x(), offsetY: e.target.y() };
                setAnotacoes((atuais) => atuais.map((a) => (a.id === item.id ? nova : a)));
                concluirMovimento([], [nova]);
              }}
            />
          ) : item.tipo === 'imagem' ? (
            <ImageAnnotation key={item.id} item={item}
              ref={(node) => { if (node) anotacaoRefs.current.set(item.id, node); else anotacaoRefs.current.delete(item.id); }}
              draggable={podeEditarAnotacao(permissoes, item, user?.uid)}
              onDragMove={(e) => {
                if (podeEditarAnotacao(permissoes, item, user?.uid)) transmitirMovimento([], [{ id: item.id, x: e.target.x(), y: e.target.y() }]);
              }}
              onDragEnd={(e) => {
                if (!podeEditarAnotacao(permissoes, item, user?.uid)) return;
                const nova = { ...item, x: e.target.x(), y: e.target.y() };
                setAnotacoes((atuais) => atuais.map((atual) => atual.id === item.id ? nova : atual));
                concluirMovimento([], [nova]);
              }}
              onContextMenu={(e) => {
                e.evt.preventDefault();
                if (!podeEditarAnotacao(permissoes, item, user?.uid) || panMoveuRef.current) return;
                setMenuNota({ id: item.id, x: Math.min(e.evt.clientX + 10, window.innerWidth - 200), y: Math.min(e.evt.clientY + 10, window.innerHeight - 180) });
              }} />
          ) : item.tipo === 'forma' ? (
            <Group
              key={item.id}
              ref={(node) => { if (node) anotacaoRefs.current.set(item.id, node); else anotacaoRefs.current.delete(item.id); }}
              x={item.x}
              y={item.y}
              draggable={podeEditarAnotacao(permissoes, item, user?.uid)}
              onDragMove={(e) => {
                if (!podeEditarAnotacao(permissoes, item, user?.uid)) return;
                transmitirMovimento([], [item.tipo === 'traco'
                  ? { id: item.id, tipo: item.tipo, offsetX: e.target.x(), offsetY: e.target.y() }
                  : { id: item.id, x: e.target.x(), y: e.target.y() }]);
              }}
              onDragEnd={(e) => {
                if (!podeEditarAnotacao(permissoes, item, user?.uid)) return;
                const nova = { ...item, x: e.target.x(), y: e.target.y() };
                setAnotacoes((atuais) => atuais.map((a) => (a.id === item.id ? nova : a)));
                concluirMovimento([], [nova]);
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
          ) : item.tipo === 'texto' && item.id !== editorTexto?.id ? (
            <Group
              key={item.id}
              ref={(node) => { if (node) anotacaoRefs.current.set(item.id, node); else anotacaoRefs.current.delete(item.id); }}
              x={item.x}
              y={item.y}
              draggable={podeEditarAnotacao(permissoes, item, user?.uid)}
              onDragMove={(e) => {
                if (!podeEditarAnotacao(permissoes, item, user?.uid)) return;
                transmitirMovimento([], [item.tipo === 'traco'
                  ? { id: item.id, tipo: item.tipo, offsetX: e.target.x(), offsetY: e.target.y() }
                  : { id: item.id, x: e.target.x(), y: e.target.y() }]);
              }}
              onDragEnd={(e) => {
                if (!podeEditarAnotacao(permissoes, item, user?.uid)) return;
                const nova = { ...item, x: e.target.x(), y: e.target.y() };
                setAnotacoes((atuais) => atuais.map((a) => (a.id === item.id ? nova : a)));
                concluirMovimento([], [nova]);
              }}
              onDblClick={(e) => {
                if (!podeEditarAnotacao(permissoes, item, user?.uid)) return;
                e.cancelBubble = true;
                setEditorTexto({ ...item });
              }}
              onContextMenu={(e) => {
                e.evt.preventDefault();
                if (!podeEditarAnotacao(permissoes, item, user?.uid)) return;
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
        <Layer listening={false}><DrawingPreview ref={previewRef} /></Layer>
        <WeatherLayer areas={areasClima} />
        {/* Mantém a grade visível sobre a névoa, sem revelar mapa ou anotações. */}
        <FogLayer
          largura={tamanhoPalco.largura}
          altura={tamanhoPalco.altura}
          ativo={nevoa.ativo}
          celulas={nevoa.celulas}
          tamanhoCelula={TAMANHO_GRID}
          opacidadeMaxima={1}
          cor="#000000"
          opaco
        />
        <GridLayer largura={tamanhoPalco.largura} altura={tamanhoPalco.altura} tamanhoCelula={TAMANHO_GRID} />
        <Layer>
          {tokens.filter((tk) => !tokenSobNevoa(tk)).map((tk) => (
            <TokenNode
              key={tk.id}
              ref={(node) => { if (node) tokenNodeRefs.current.set(tk.id, node); else tokenNodeRefs.current.delete(tk.id); }}
              token={tk}
              raio={TAMANHO_GRID / 2 - 2}
              selecionado={false}
              medindo={false}
              interativo={permissoes.podeMover && ferramenta === 'selecionar' && !editorTexto && !tokenSobNevoa(tk)}
              ferramenta="selecionar"
              onSelecionar={() => {}}
              onDuploClique={() => {}}
              onArrasteInicio={() => {}}
              onArraste={(e) => {
                if (permissoes.podeMover) transmitirMovimento([{ id: tk.id, x: e.target.x(), y: e.target.y() }]);
              }}
              onArrasteFim={(e) => {
                if (!permissoes.podeMover || !permissoes.podeVerMapa) return;
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
                concluirMovimento([novoToken]);
              }}
              onMenuContexto={() => {}}
            />
          ))}
        </Layer>
      </Stage>}
      {colando && <p className="clipboard-status" role="status">Colando no mapa…</p>}
      {editorTexto && permissoes.podeAnotar && <CanvasTextEditor key={editorTexto.id} stageRef={stageRef} editor={editorTexto}
        onChange={(texto) => setEditorTexto((atual) => atual && ({ ...atual, texto }))}
        onCancel={() => setEditorTexto(null)}
        onCommit={async () => {
          const item = editorTexto;
          setEditorTexto(null);
          if (!podeEditarAnotacao(permissoes, item, user?.uid) || !item.texto.trim()) return;
          setErroAnotacao('');
          if (await salvarAnotacao(sessaoId, item)) setAnotacoes((atuais) => [...atuais.filter((a) => a.id !== item.id), item]);
          else setErroAnotacao('Não foi possível salvar o texto. Tente novamente.');
        }} />}
      {(erroAnotacao || erroMovimento) && permissoes.podeVerMapa && <p className="playerview-map-error" role="alert">{erroAnotacao || erroMovimento}</p>}
      {erroMapaImagem && <p className="playerview-map-error" role="alert">O mapa da campanha não carregou. Peça ao mestre para enviar a imagem novamente.</p>}
      {menuNota && permissoes.podeAnotar && (() => {
        const nota = anotacoes.find((a) => a.id === menuNota.id && ['texto', 'imagem'].includes(a.tipo));
        if (!podeEditarAnotacao(permissoes, nota, user?.uid)) return null;
        const atualizarNota = (alteracoes) => {
          const nova = { ...nota, ...alteracoes };
          setAnotacoes((atuais) => atuais.map((a) => (a.id === nota.id ? nova : a)));
          salvarAnotacao(sessaoId, nova);
        };
        const fechar = () => setMenuNota(null);
        return (
          <div className="token-contextual" style={{ left: menuNota.x, top: menuNota.y }} onMouseDown={(e) => e.stopPropagation()}>
            <strong>{nota.tipo === 'imagem' ? 'Imagem' : 'Nota'}</strong>
            {nota.tipo === 'texto' && <>
              <label className="token-contextual__cor">Cor <input type="color" value={nota.cor || '#ffffff'} onChange={(e) => atualizarNota({ cor: e.target.value })} /></label>
              <button onClick={() => { atualizarNota({ fontSize: Math.min(60, (nota.fontSize || 20) + 2) }); fechar(); }}>Aumentar fonte</button>
              <button onClick={() => { atualizarNota({ fontSize: Math.max(10, (nota.fontSize || 20) - 2) }); fechar(); }}>Diminuir fonte</button>
            </>}
            <button className="token-contextual__excluir" onClick={() => {
              setAnotacoes((atuais) => atuais.filter((a) => a.id !== nota.id));
              excluirAnotacao(sessaoId, nota.id);
              fechar();
            }}>{nota.tipo === 'imagem' ? 'Apagar imagem' : 'Apagar nota'}</button>
          </div>
        );
      })()}
    </div>
  );
}
