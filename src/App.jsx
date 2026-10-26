import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Stage, Layer, Line, Text, Rect, Group, Ellipse } from 'react-konva';
import MapaImagem from './components/MapaImagem';
import DrawingPreview from './components/DrawingPreview';
import MesaToolbar from './components/MesaToolbar';
import TokenModal from './components/TokenModal';
import { isTextEditingTarget } from './utils/keyboard';
import { prepararImagem } from './utils/imagem.js';
import { enviarImagemParaServidor } from './services/upload.js';
import { clarearCelula, cobrirCelula, revelarTodasAsCelulas } from './utils/nevoa.js';
import { novoId } from './utils/id';
import TokenGroupControls from './components/TokenGroupControls';
import TokenNode from './components/TokenNode';
import GridLayer from './components/GridLayer';
import FogLayer from './components/FogLayer';
import MeasurementLayer from './components/MeasurementLayer';
import SelectionRectangle from './components/SelectionRectangle';
import CanvasTextEditor from './components/CanvasTextEditor';
import PainelManager from './components/manager';
import './App.css';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { Users, X, Move, UserRoundPlus } from 'lucide-react';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SessionsPage from './pages/SessionsPage.jsx';
import PlayerView from './pages/PlayerView.jsx';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from './auth/firebase.js';
import { salvarMapa } from './services/mapas.js';
import {
  agendarSalvarAnotacao,
  agendarSalvarNevoa,
  agendarSalvarToken,
  excluirAnotacao,
  excluirAnotacoes,
  excluirToken,
  excluirTokens,
  finalizarSalvarAnotacao,
  finalizarSalvarNevoa,
  finalizarSalvarToken,
  salvarAnotacao,
  salvarAnotacoes,
  salvarNevoa,
  salvarToken,
  salvarTokens,
} from './services/mesa.js';

function ProtectedRoute({ children }) {
  const { user, loading, configured } = useAuth();
  if (!configured) return <Navigate to="/login" replace />;
  if (loading) return <div className="auth-loading">Carregando...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function EntrarSessao() {
  const { codigo } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Carregando...');
  useEffect(() => {
    const entrar = async () => {
      if (!db || !user || !codigo) {
        setStatus('Convite inválido.');
        return;
      }
      try {
        const q = query(collection(db, 'convites'), where('codigo', '==', codigo.toUpperCase()));
        const snap = await getDocs(q);
        if (snap.empty) {
          setStatus('Código de convite inválido ou expirado.');
          return;
        }
        const conviteDoc = snap.docs[0];
        const convite = conviteDoc.data();
        if (convite.status && convite.status !== 'pendente') {
          setStatus('Este convite já foi utilizado.');
          return;
        }
        const sessaoId = convite.sessaoId;
        await setDoc(doc(db, 'sessoesMembros', `${sessaoId}_${user.uid}`), {
          sessaoId,
          usuarioId: user.uid,
          email: user.email,
          papel: 'jogador',
          podeMover: false,
          podeAdicionar: false,
          adicionadoEm: serverTimestamp(),
        }, { merge: true });
        try {
          await updateDoc(doc(db, 'convites', conviteDoc.id), {
            status: 'usado',
            usadoPor: user.uid,
            usadoEm: serverTimestamp(),
          });
        } catch (e) {
          console.warn('Não foi possível atualizar convite:', e);
        }
        setStatus('Entrando na mesa...');
        navigate(`/jogador/${sessaoId}`, { replace: true });
      } catch (e) {
        console.error(e);
        setStatus('Erro ao entrar na sessão.');
      }
    };
    entrar();
  }, [codigo, user, navigate]);
  return <div className="auth-loading">{status}</div>;
}

function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/cadastro" element={<AuthPage mode="signup" />} />
    <Route path="/" element={<ProtectedRoute><SessionsPage /></ProtectedRoute>} />
    <Route path="/sessoes" element={<ProtectedRoute><SessionsPage /></ProtectedRoute>} />
    <Route path="/mesa" element={<ProtectedRoute><MesaRPG /></ProtectedRoute>} />
    <Route path="/mesa/:sessaoId" element={<ProtectedRoute><MesaRPG /></ProtectedRoute>} />
    <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
    <Route path="/entrar/:codigo" element={<ProtectedRoute><EntrarSessao /></ProtectedRoute>} />
    <Route path="/jogador/:sessaoId" element={<ProtectedRoute><PlayerView /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}

const TAMANHO_GRID = 50;
const METROS_POR_QUADRADO = 1.5;
const ESCALA_MINIMA = 0.2;
const ESCALA_MAXIMA = 4;

function obterGeometriaForma(forma, inicio, ponteiro) {
  let dx = ponteiro.x - inicio.x;
  let dy = ponteiro.y - inicio.y;
  if (forma === 'circulo' || forma === 'quadrado') {
    const lado = Math.max(Math.abs(dx), Math.abs(dy));
    dx = (dx < 0 ? -1 : 1) * lado;
    dy = (dy < 0 ? -1 : 1) * lado;
  }
  const x = inicio.x + Math.min(0, dx);
  const y = inicio.y + Math.min(0, dy);
  const largura = Math.abs(dx);
  const altura = Math.abs(dy);
  const pontos = forma === 'triangulo'
    ? [largura / 2, 0, largura, altura, 0, altura]
    : forma === 'estrela'
      ? Array.from({ length: 10 }, (_, indice) => {
        const angulo = -Math.PI / 2 + indice * Math.PI / 5;
        const raio = indice % 2 === 0 ? 1 : 0.42;
        return [largura / 2 + Math.cos(angulo) * largura / 2 * raio,
          altura / 2 + Math.sin(angulo) * altura / 2 * raio];
      }).flat()
    : [inicio.x - x, inicio.y - y, inicio.x + dx - x, inicio.y + dy - y];
  return { x, y, largura, altura, pontos };
}

// Componente principal da mesa: mantém o estado e conecta os componentes da interface.
function MesaRPG() {
  const navigate = useNavigate();
  const { sessaoId } = useParams();
  // Estados da mesa 🧠
  const [tokens, setTokens] = useState([]);
  const [tokensSelecionados, setTokensSelecionados] = useState([]);
  const [posicoesIniciais, setPosicoesIniciais] = useState({});
  const [grupoArrastado, setGrupoArrastado] = useState([]);
  const [selecaoArea, setSelecaoArea] = useState(null);
  const selecaoAreaConcluida = useRef(false);
  const selecaoPendente = useRef(false);
  const posicoesGrupoMoldura = useRef(null);
  const redimensionamentoGrupo = useRef(null);
  const [janelaManager,setJanelaManager]= useState(false);
  const [janelaToken, setJanelaToken] = useState(false);
  const [corSelecionada, setCorSelecionada] = useState('#ff0044');
  const [imagemToken, setImagemToken] = useState(null);
  const [quantTokens, setQuantTokens] = useState(1);
  const [vidatoken, setVidaToken]=useState(0);
  const [nometoken, setNomeToken]=useState(null)
  const [hpInputMenu, setHpInputMenu] = useState('');
  const [urlMapa, setUrlMapa] = useState(null);
<<<<<<< HEAD
  const [erroCarregarMapa, setErroCarregarMapa] = useState(false);
  const [jogadoresMesa, setJogadoresMesa] = useState([]);
  const [jogadorPermissoes, setJogadorPermissoes] = useState(null);
  const [erroPermissao, setErroPermissao] = useState('');
  const [erroUploadMapa, setErroUploadMapa] = useState('');
  const [enviandoMapa, setEnviandoMapa] = useState(false);
=======
  const [avisoMesa, setAvisoMesa] = useState(null);
>>>>>>> 98db535702dec70a750b0ee10cd10729de1e5cf3
  const [ferramenta, setFerramenta] = useState('selecionar');
  const [formaDesenho, setFormaDesenho] = useState('livre');
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
  const [nevoa, setNevoa] = useState({ ativo: false, celulas: {} });
  const [modoNevoa, setModoNevoa] = useState('clarear');
  const stageRef = useRef(null);
  const tokenNodeRefs = useRef(new Map());
  const anotacaoNodeRefs = useRef(new Map());
  const tracoAtual = useRef(null);
  const formaAtual = useRef(null);
  const desenhoPreviewRef = useRef(null);
  const arrasteAnotacoes = useRef(null);
  const anotacoesNoArrasteToken = useRef(null);
  const panRef = useRef(null);
  const panMoveuRef = useRef(false);
  const tokensRef = useRef(tokens);
  const nevoaRef = useRef(nevoa);
  const nevoaEditandoRef = useRef(false);
  const historicoRef = useRef([]);
  const estadoHistoricoRef = useRef({ tokens, anotacoes, urlMapa });
  const estadoPendenteRef = useRef(null);
  const temporizadorHistoricoRef = useRef(null);
  const desfazendoRef = useRef(false);
  const [sessaoAtiva] = useState(sessaoId || null);

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
  const [mapaImagemCarregado, setMapaImagemCarregado] = useState(false);
  const mapaAjustadoRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !urlMapa || !mapaImagemCarregado || !tamanhoPalco.largura || !tamanhoPalco.altura) return;
    if (mapaAjustadoRef.current === urlMapa) return;
    const larguraVisivel = window.innerWidth;
    const alturaVisivel = window.innerHeight;
    const escala = Math.min(1, larguraVisivel / tamanhoPalco.largura, alturaVisivel / tamanhoPalco.altura);
    stage.scale({ x: escala, y: escala });
    stage.position({
      x: (larguraVisivel - tamanhoPalco.largura * escala) / 2,
      y: (alturaVisivel - tamanhoPalco.altura * escala) / 2,
    });
    stage.batchDraw();
    mapaAjustadoRef.current = urlMapa;
  }, [urlMapa, mapaImagemCarregado, tamanhoPalco]);

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

  // Mantém o estado mais recente acessível em handlers de blur/Enter do menu do token.
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  useEffect(() => {
    nevoaRef.current = nevoa;
  }, [nevoa]);

  useEffect(() => {
    if (!db || !sessaoAtiva) return;
    const unsubTokens = onSnapshot(collection(db, 'sessoes', sessaoAtiva, 'tokens'), (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTokens(lista);
    });
    const unsubMapa = onSnapshot(doc(db, 'sessoes', sessaoAtiva, 'estado', 'mapa'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.url) {
          if (data.url !== mapaAjustadoRef.current) {
            mapaAjustadoRef.current = null;
            setMapaImagemCarregado(false);
          }
          setErroCarregarMapa(false);
          setUrlMapa(data.url);
        }
      }
    });
    const membrosQuery = query(collection(db, 'sessoesMembros'), where('sessaoId', '==', sessaoAtiva));
    const unsubMembros = onSnapshot(membrosQuery, (snap) => {
      const lista = snap.docs
        .map((membro) => ({ id: membro.id, ...membro.data() }))
        .filter((membro) => membro.papel !== 'mestre')
        .sort((a, b) => (a.nome || a.email || '').localeCompare(b.nome || b.email || '', 'pt-BR'));
      setJogadoresMesa(lista);
      setJogadorPermissoes((atual) => atual ? (lista.find((jogador) => jogador.id === atual.id) || null) : null);
    }, (err) => console.error('Erro ao ouvir jogadores da sessão:', err));
    const unsubAnotacoes = onSnapshot(collection(db, 'sessoes', sessaoAtiva, 'anotacoes'), (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAnotacoes(lista);
    });
    const unsubNevoa = onSnapshot(doc(db, 'sessoes', sessaoAtiva, 'estado', 'fog'), (snap) => {
      // Enquanto o mestre pinta a névoa, ignora snapshots antigos para não desfazer o traço.
      if (nevoaEditandoRef.current) return;
      if (!snap.exists()) {
        setNevoa({ ativo: false, celulas: {} });
        return;
      }
      const data = snap.data();
      setNevoa({ ativo: Boolean(data.ativo), celulas: data.celulas || {} });
    });
    return () => {
      unsubTokens();
      unsubMapa();
      unsubMembros();
      unsubAnotacoes();
      unsubNevoa();
    };
  }, [sessaoAtiva]);

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
      const atual = estadoHistoricoRef.current;
      desfazendoRef.current = true;
      estadoHistoricoRef.current = anterior;
      setTokens(anterior.tokens);
      setAnotacoes(anterior.anotacoes);
      setUrlMapa(anterior.urlMapa);

      // O desfazer também precisa chegar ao Firestore, senão o próximo snapshot reverte tudo.
      const idsTokensAnteriores = new Set(anterior.tokens.map((token) => token.id));
      const idsAnotacoesAnteriores = new Set(anterior.anotacoes.map((anotacao) => anotacao.id));
      salvarTokens(sessaoAtiva, anterior.tokens);
      salvarAnotacoes(sessaoAtiva, anterior.anotacoes);
      excluirTokens(sessaoAtiva, atual.tokens
        .filter((token) => !idsTokensAnteriores.has(token.id))
        .map((token) => token.id));
      excluirAnotacoes(sessaoAtiva, atual.anotacoes
        .filter((anotacao) => !idsAnotacoesAnteriores.has(anotacao.id))
        .map((anotacao) => anotacao.id));
    };

    window.addEventListener('keydown', desfazer);
    return () => window.removeEventListener('keydown', desfazer);
  }, [sessaoAtiva]);

  // Alternar modo de medição 📏
  const alternarMedindo = () => {
    setMedindo(!medindo);
    setPontoInicial(null);
    setPontoAtual(null);
    setMenuToken(null);
    setTokensSelecionados([]); // Limpa a seleção ao alternar
  };

  const limparAnotacoes = () => {
    const ids = anotacoes.map((item) => item.id);
    setAnotacoes([]);
    setAnotacaoSelecionada(null);
    setAnotacoesSelecionadas([]);
    setAbrirPainelAnotacao(false);
    setEditorTexto(null);
    excluirAnotacoes(sessaoAtiva, ids);
  };

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
      x: anotacao.tipo === 'traco' ? (anotacao.offsetX || 0) : anotacao.x,
      y: anotacao.tipo === 'traco' ? (anotacao.offsetY || 0) : anotacao.y,
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
    Object.entries(arraste.origens).forEach(([id, origem]) => {
      if (id !== arraste.id) anotacaoNodeRefs.current.get(id)?.position({ x: origem.x + dx, y: origem.y + dy });
    });
    Object.entries(arraste.tokensOriginais).forEach(([id, origem]) => {
      tokenNodeRefs.current.get(id)?.moverPara(origem.x + dx, origem.y + dy);
    });
  };

  const finalizarArrasteAnotacao = (e) => {
    const arraste = arrasteAnotacoes.current;
    if (!arraste) return;
    arrasteAnotacoes.current = null;
    const dx = e.target.x() - arraste.x;
    const dy = e.target.y() - arraste.y;

    const anotacoesAtualizadas = [];
    anotacoes.forEach((item) => {
      const origem = arraste.origens[item.id];
      if (!origem) return;
      anotacoesAtualizadas.push(item.tipo === 'traco'
        ? { ...item, offsetX: origem.x + dx, offsetY: origem.y + dy }
        : { ...item, x: origem.x + dx, y: origem.y + dy });
    });
    if (anotacoesAtualizadas.length > 0) {
      const porId = new Map(anotacoesAtualizadas.map((item) => [item.id, item]));
      setAnotacoes((atuais) => atuais.map((item) => porId.get(item.id) || item));
      salvarAnotacoes(sessaoAtiva, anotacoesAtualizadas);
    }

    const tokensAtualizados = [];
    tokens.forEach((token) => {
      const origem = arraste.tokensOriginais[token.id];
      if (!origem) return;
      tokensAtualizados.push({ ...token, x: origem.x + dx, y: origem.y + dy });
    });
    if (tokensAtualizados.length > 0) {
      const porId = new Map(tokensAtualizados.map((token) => [token.id, token]));
      setTokens((atuais) => atuais.map((token) => porId.get(token.id) || token));
      salvarTokens(sessaoAtiva, tokensAtualizados);
    }
  };

  useEffect(() => {
    const pararPan = (ev) => {
      if (ev.button === 2 && panRef.current) {
        panRef.current = null;
        if (stageRef.current) stageRef.current.container().style.cursor = 'default';
      }
      if (ev.button === 0 && nevoaEditandoRef.current) {
        nevoaEditandoRef.current = false;
        finalizarSalvarNevoa(sessaoAtiva);
      }
    };
    const aoPerderFoco = () => {
      if (!nevoaEditandoRef.current) return;
      nevoaEditandoRef.current = false;
      finalizarSalvarNevoa(sessaoAtiva);
    };
    window.addEventListener('mouseup', pararPan);
    window.addEventListener('blur', aoPerderFoco);
    return () => {
      window.removeEventListener('mouseup', pararPan);
      window.removeEventListener('blur', aoPerderFoco);
    };
  }, [sessaoAtiva]);

  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.container().style.cursor = ferramenta === 'texto'
        ? 'text'
        : ferramenta === 'desenhar' || ferramenta === 'nevoa' ? 'crosshair' : 'default';
    }
  }, [ferramenta]);

  const salvarTextoCanvas = () => {
    if (!editorTexto) return;
    const texto = editorTexto.texto.trim();
    if (texto) {
      const anotacao = {
        ...editorTexto,
        tipo: 'texto',
        texto,
        fontFamily: editorTexto.fontFamily || fonteAnotacao,
        fontSize: editorTexto.fontSize || tamanhoFonte,
      };
      setAnotacoes((atuais) => (atuais.some((item) => item.id === anotacao.id)
        ? atuais.map((item) => (item.id === anotacao.id ? anotacao : item))
        : [...atuais, anotacao]));
      salvarAnotacao(sessaoAtiva, anotacao);
      setAnotacaoSelecionada(anotacao.id);
      setAnotacoesSelecionadas([anotacao.id]);
      setAbrirPainelAnotacao(true);
      setFerramenta('texto');
    } else {
      setAnotacoes((atuais) => atuais.filter((item) => item.id !== editorTexto.id));
      excluirAnotacao(sessaoAtiva, editorTexto.id);
      setFerramenta('selecionar');
    }
    setEditorTexto(null);
  };

  const redimensionarTexto = (id, dimensoes) => {
    const atual = anotacoes.find((item) => item.id === id);
    if (atual) {
      const atualizada = { ...atual, ...dimensoes };
      setAnotacoes((atuais) => atuais.map((item) => (item.id === id ? { ...item, ...dimensoes } : item)));
      agendarSalvarAnotacao(sessaoAtiva, atualizada);
    }
    setEditorTexto((atualEditor) => (atualEditor?.id === id ? { ...atualEditor, ...dimensoes } : atualEditor));
  };

  // Alternar modal e Criar Tokens 🪙
  const alternarToken = () => setJanelaToken(!janelaToken);

  const criarNovoToken = () => {
    const novosTokens = [];
    const quantidade = Math.max(1, Number(quantTokens) || 1);
    const vida = Number(vidatoken) || 0;
    for (let i = 0; i < quantidade; i++) {
      novosTokens.push({
        id: novoId(),
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
    salvarTokens(sessaoAtiva, novosTokens);
    setJanelaToken(false);
  };

  const selecionarImagemToken = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      if (sessaoAtiva) {
        try {
          const url = await enviarImagemParaServidor(arquivo, { sessaoId: sessaoAtiva, tipo: 'token' });
          setImagemToken(url);
          return;
        } catch (err) {
          console.warn('Upload no servidor falhou; usando imagem embutida no token.', err);
        }
      }
      const dataUrl = await prepararImagem(arquivo, {
        ladoMaximo: 512,
        tamanhoMaximo: 320 * 1024,
        qualidade: 0.82,
      });
      setImagemToken(dataUrl);
    } catch (err) {
      console.error('Erro ao processar imagem do token:', err);
      setAvisoMesa('Não foi possível processar essa imagem. Tente outro arquivo.');
    }
  };

  // Exclusão de Tokens Selecionados 🗑️
  const removerTokensSelecionados = () => {
    const ids = [...tokensSelecionados];
    setTokens((tokensAtuais) => tokensAtuais.filter((tk) => !ids.includes(tk.id)));
    setTokensSelecionados([]);
    setMenuToken(null);
    excluirTokens(sessaoAtiva, ids);
  };

  // Ajustes do painel de status: sempre persistem junto com o estado local.
  const alterarVidaToken = (id, delta) => {
    const token = tokensRef.current.find((item) => item.id === id);
    if (!token) return;
    const vidaAtual = Number(token.vida) || 0;
    // Se o token antigo não tinha vida máxima salva, fixa o máximo atual antes de alterar.
    const maximo = Number(token.vidamax) || Math.max(0, vidaAtual) || 0;
    // Sem limites: a vida atual pode ficar negativa ou passar do máximo (buff temporário).
    const vida = vidaAtual + delta;
    const atualizado = { ...token, vida, vidamax: maximo };
    const proximos = tokensRef.current.map((item) => (item.id === id ? atualizado : item));
    tokensRef.current = proximos;
    setTokens(proximos);
    salvarToken(sessaoAtiva, atualizado);
  };

  const removerToken = (id) => {
    setTokens((atuais) => atuais.filter((item) => item.id !== id));
    setTokensSelecionados((atuais) => atuais.filter((itemId) => itemId !== id));
    setMenuToken((atual) => (atual?.id === id ? null : atual));
    excluirToken(sessaoAtiva, id);
  };

  // Névoa (fog of war) alinhada ao grid.
  // Clarear diminui a opacidade da célula (1 → 0,5 → 0) sem remover o dado,
  // então "Cobrir tudo" consegue restaurar a névoa depois.
  const aplicarNevoa = (proxima, imediato = false) => {
    nevoaRef.current = proxima;
    setNevoa(proxima);
    if (imediato) salvarNevoa(sessaoAtiva, proxima);
    else agendarSalvarNevoa(sessaoAtiva, proxima);
  };

  const pintarNevoa = (pos) => {
    const atual = nevoaRef.current;
    if (!atual.ativo || !pos) return;
    if (pos.x < 0 || pos.y < 0 || pos.x >= tamanhoPalco.largura || pos.y >= tamanhoPalco.altura) return;
    const coluna = Math.floor(pos.x / TAMANHO_GRID);
    const linha = Math.floor(pos.y / TAMANHO_GRID);
    const celulas = modoNevoa === 'cobrir'
      ? cobrirCelula(atual.celulas, coluna, linha)
      : clarearCelula(atual.celulas, coluna, linha);
    if (celulas === atual.celulas) return;
    aplicarNevoa({ ...atual, celulas });
  };

  const cobrirTudoNevoa = () => {
    const proxima = { ...nevoaRef.current, ativo: true, celulas: {} };
    aplicarNevoa(proxima, true);
  };

  const revelarTudoNevoa = () => {
    const celulas = revelarTodasAsCelulas({
      largura: tamanhoPalco.largura,
      altura: tamanhoPalco.altura,
      tamanhoCelula: TAMANHO_GRID,
    });
    aplicarNevoa({ ...nevoaRef.current, ativo: true, celulas }, true);
  };

  const definirNevoaAtiva = (ativo) => {
    aplicarNevoa({ ...nevoaRef.current, ativo }, true);
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

  // Seleciona tokens direto pelo painel de status (o painel permanece aberto).
  const selecionarTokenPeloPainel = (id, adicionar) => {
    setFerramenta('selecionar');
    setMedindo(false);
    setAnotacaoSelecionada(null);
    setAnotacoesSelecionadas([]);
    setAbrirPainelAnotacao(false);
    setTokensSelecionados((atuais) => {
      if (!adicionar) return [id];
      return atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id];
    });

    // Se o token estiver fora da área visível, centraliza o palco nele.
    const token = tokensRef.current.find((item) => item.id === id);
    const stage = stageRef.current;
    if (token && stage) {
      const escala = stage.scaleX() || 1;
      const telaX = token.x * escala + stage.x();
      const telaY = token.y * escala + stage.y();
      const margem = 90;
      if (telaX < margem || telaX > window.innerWidth - margem || telaY < margem || telaY > window.innerHeight - margem) {
        stage.position({
          x: window.innerWidth / 2 - token.x * escala,
          y: window.innerHeight / 2 - token.y * escala,
        });
        stage.batchDraw();
      }
    }
  };

  useEffect(() => {
    const tratarTeclas = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (isTextEditingTarget(e.target)) return;
      if (janelaToken || menuToken || tokensSelecionados.length === 0) return;

      e.preventDefault();
      const idsSelecionados = new Set(tokensSelecionados);
      setTokens((atuais) => atuais.filter((token) => !idsSelecionados.has(token.id)));
      setTokensSelecionados([]);
      excluirTokens(sessaoAtiva, [...idsSelecionados]);
    };
    window.addEventListener('keydown', tratarTeclas);
    return () => window.removeEventListener('keydown', tratarTeclas);
  }, [tokensSelecionados, janelaToken, menuToken, sessaoAtiva]);

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
        x: item.tipo === 'traco' ? (item.offsetX || 0) : item.x,
        y: item.tipo === 'traco' ? (item.offsetY || 0) : item.y,
      }]));
  };

  const handleDragMove = (e, idLider) => {
    const posInicialLider = posicoesIniciais[idLider];
    if (!posInicialLider) return;

    const xAtualLider = e.target.x();
    const yAtualLider = e.target.y();

    const deltaX = xAtualLider - posInicialLider.x;
    const deltaY = yAtualLider - posInicialLider.y;

    grupoArrastado.forEach((id) => {
      if (id === idLider) return;
      const inicio = posicoesIniciais[id];
      if (inicio) tokenNodeRefs.current.get(id)?.moverPara(inicio.x + deltaX, inicio.y + deltaY);
    });
    const anotacoesOriginais = anotacoesNoArrasteToken.current || {};
    Object.entries(anotacoesOriginais).forEach(([id, origem]) => {
      anotacaoNodeRefs.current.get(id)?.position({ x: origem.x + deltaX, y: origem.y + deltaY });
    });
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

    circulo.position({ x: xLiderNovo, y: yLiderNovo });
    tokenNodeRefs.current.get(idLider)?.moverPara(xLiderNovo, yLiderNovo);

    const deltaX = xLiderNovo - inicioLider.x;
    const deltaY = yLiderNovo - inicioLider.y;

    const idsMovidos = new Set(grupoArrastado.length > 0 ? grupoArrastado : [idLider]);
    const tokensAtualizados = [];
    tokens.forEach((tk) => {
      if (!idsMovidos.has(tk.id)) return;
      const inicio = posicoesIniciais[tk.id] || { x: tk.x, y: tk.y };
      tokensAtualizados.push({ ...tk, x: inicio.x + deltaX, y: inicio.y + deltaY });
    });
    if (tokensAtualizados.length > 0) {
      const porId = new Map(tokensAtualizados.map((tk) => [tk.id, tk]));
      setTokens((atuais) => atuais.map((tk) => porId.get(tk.id) || tk));
      salvarTokens(sessaoAtiva, tokensAtualizados);
    }

    const anotacoesOriginais = anotacoesNoArrasteToken.current || {};
    const anotacoesAtualizadas = [];
    anotacoes.forEach((item) => {
      const origem = anotacoesOriginais[item.id];
      if (!origem) return;
      anotacoesAtualizadas.push(item.tipo === 'traco'
        ? { ...item, offsetX: origem.x + deltaX, offsetY: origem.y + deltaY }
        : { ...item, x: origem.x + deltaX, y: origem.y + deltaY });
    });
    if (anotacoesAtualizadas.length > 0) {
      const porId = new Map(anotacoesAtualizadas.map((item) => [item.id, item]));
      setAnotacoes((atuais) => atuais.map((item) => porId.get(item.id) || item));
      salvarAnotacoes(sessaoAtiva, anotacoesAtualizadas);
    }

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
    if (!selecaoArea || !selecaoPendente.current) return;
    selecaoPendente.current = false;
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
      } else if (item.tipo === 'forma') {
        limites = { esquerda: item.x, direita: item.x + item.largura, topo: item.y, base: item.y + item.altura };
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

  // Finaliza a seleção retangular mesmo se o botão for solto fora do palco.
  const finalizarSelecaoRef = useRef(null);
  useEffect(() => {
    finalizarSelecaoRef.current = finalizarSelecaoArea;
  });

  useEffect(() => {
    if (!selecaoArea) return undefined;
    const aoSoltar = (evento) => {
      if (evento.button === 0) finalizarSelecaoRef.current?.();
    };
    window.addEventListener('mouseup', aoSoltar);
    return () => window.removeEventListener('mouseup', aoSoltar);
  }, [selecaoArea]);

  const tokensDoGrupo = tokens.filter((tk) => tokensSelecionados.includes(tk.id));
  const anotacoesDoGrupo = anotacoes.filter((item) => anotacoesSelecionadas.includes(item.id));
  const limitesAnotacoes = anotacoesDoGrupo.length ? (() => {
    const caixas = anotacoesDoGrupo.map((item) => {
      if (item.tipo === 'texto') {
        const largura = item.boxWidth || Math.max(48, Math.max(...item.texto.split('\n').map((linha) => linha.length)) * (item.fontSize || 20) * 0.62 + 16);
        const altura = item.boxHeight || item.texto.split('\n').length * (item.fontSize || 20) * 1.25 + 12;
        return { esquerda: item.x, direita: item.x + largura, topo: item.y, base: item.y + altura };
      }
      if (item.tipo === 'forma') {
        return { esquerda: item.x, direita: item.x + item.largura, topo: item.y, base: item.y + item.altura };
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
    const atualizados = [];
    tokens.forEach((tk) => {
      if (!tokensSelecionados.includes(tk.id)) return;
      atualizados.push(eixo === 'horizontal'
        ? { ...tk, x: centro * 2 - tk.x }
        : { ...tk, y: centro * 2 - tk.y });
    });
    if (atualizados.length === 0) return;
    const porId = new Map(atualizados.map((tk) => [tk.id, tk]));
    setTokens((atuais) => atuais.map((tk) => porId.get(tk.id) || tk));
    salvarTokens(sessaoAtiva, atualizados);
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
    const atualizados = [];
    tokens.forEach((tk) => {
      const origem = inicio.posicoes[tk.id];
      if (!origem) return;
      atualizados.push({
        ...tk,
        x: inicio.ancora.x + (origem.x - inicio.ancora.x) * escala,
        y: inicio.ancora.y + (origem.y - inicio.ancora.y) * escala,
        escala: Math.max(0.25, Math.min(4, origem.escala * escala)),
      });
    });
    if (atualizados.length === 0) return;
    const porId = new Map(atualizados.map((tk) => [tk.id, tk]));
    setTokens((atuais) => atuais.map((tk) => porId.get(tk.id) || tk));
    atualizados.forEach((tk) => agendarSalvarToken(sessaoAtiva, tk));
  };

  const finalizarRedimensionamento = () => {
    redimensionamentoGrupo.current = null;
    tokensSelecionados.forEach((id) => finalizarSalvarToken(id));
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
    Object.entries(posicoes).forEach(([id, inicio]) => {
      tokenNodeRefs.current.get(id)?.moverPara(inicio.x + deltaX, inicio.y + deltaY);
    });
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
    const atualizados = [];
    Object.entries(posicoes).forEach(([id, inicio]) => {
      const token = tokens.find((tk) => tk.id === id);
      if (token) atualizados.push({ ...token, x: inicio.x + deltaX, y: inicio.y + deltaY });
    });
    if (atualizados.length > 0) {
      const porId = new Map(atualizados.map((tk) => [tk.id, tk]));
      setTokens((atuais) => atuais.map((tk) => porId.get(tk.id) || tk));
      salvarTokens(sessaoAtiva, atualizados);
    }
    posicoesGrupoMoldura.current = null;
    e.target.position({ x: limites.esquerda + deltaX, y: limites.topo + deltaY });
  };

  // Carregar Mapa de Imagem 📂
  const aplicarMapaCompactado = async (arquivo) => {
    const dataUrl = await prepararImagem(arquivo, {
      ladoMaximo: 2000,
      tamanhoMaximo: 760 * 1024,
      qualidade: 0.76,
    });
    setUrlMapa(dataUrl);
    if (!db || !sessaoAtiva) return;
    try {
      await setDoc(doc(db, 'sessoes', sessaoAtiva, 'estado', 'mapa'), {
        url: dataUrl,
        atualizadoEm: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Erro ao salvar mapa compactado:', err);
      throw new Error('O mapa foi aplicado só nesta tela: a imagem é grande demais para sincronizar.');
    }
  };

  const handleCarregarMapa = async (e) => {
<<<<<<< HEAD
    const arquivo = e.target.files[0];
    e.target.value = '';
    if (!arquivo || enviandoMapa) return;
    setErroUploadMapa('');
    if (!db || !sessaoAtiva) {
      setErroUploadMapa('Selecione uma campanha para salvar o mapa.');
      return;
    }
    if (!arquivo.type.startsWith('image/')) {
      setErroUploadMapa('Escolha um arquivo de imagem válido.');
      return;
    }

    setEnviandoMapa(true);
    try {
      const urlDownload = await salvarMapa(sessaoAtiva, arquivo);
      mapaAjustadoRef.current = null;
      setMapaImagemCarregado(false);
      setUrlMapa(urlDownload);
    } catch (err) {
      console.error('Erro ao enviar mapa:', err);
      setErroUploadMapa(err?.message || 'Não foi possível salvar o mapa no Firestore.');
    } finally {
      setEnviandoMapa(false);
=======
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;

    // 1) Servidor próprio: public/uploads/<sessao>/ e caminho relativo no Firestore.
    let motivoServidor = null;
    if (sessaoAtiva) {
      try {
        const urlServidor = await enviarImagemParaServidor(arquivo, { sessaoId: sessaoAtiva, tipo: 'mapa' });
        setUrlMapa(urlServidor);
        setAvisoMesa(null);
        if (db) {
          try {
            await setDoc(doc(db, 'sessoes', sessaoAtiva, 'estado', 'mapa'), {
              url: urlServidor,
              atualizadoEm: serverTimestamp()
            }, { merge: true });
          } catch (err) {
            console.error('Erro ao salvar caminho do mapa:', err);
            setAvisoMesa('Mapa carregado, mas não foi possível sincronizar com os jogadores.');
          }
        }
        return;
      } catch (err) {
        console.error('Erro ao salvar mapa no servidor:', err);
        motivoServidor = err?.message || 'falha desconhecida';
      }
    }

    // 2) Firebase Storage, quando o bucket estiver configurado.
    if (storage && sessaoAtiva) {
      try {
        const arquivoRef = ref(storage, `mapas/${sessaoAtiva}/${Date.now()}-${arquivo.name}`);
        await uploadBytes(arquivoRef, arquivo);
        const urlDownload = await getDownloadURL(arquivoRef);
        setUrlMapa(urlDownload);
        setAvisoMesa(null);
        if (db) {
          try {
            await setDoc(doc(db, 'sessoes', sessaoAtiva, 'estado', 'mapa'), {
              url: urlDownload,
              atualizadoEm: serverTimestamp()
            }, { merge: true });
          } catch (err) {
            console.error('Erro ao salvar referência do mapa:', err);
            setAvisoMesa('Mapa carregado, mas não foi possível sincronizar com os jogadores.');
          }
        }
        return;
      } catch (err) {
        console.error('Erro ao enviar mapa para o Storage:', err);
      }
>>>>>>> 98db535702dec70a750b0ee10cd10729de1e5cf3
    }

    // 3) Último recurso: imagem comprimida dentro do documento do Firestore.
    try {
      await aplicarMapaCompactado(arquivo);
      setAvisoMesa(
        motivoServidor
          ? `Upload no servidor falhou (${motivoServidor}). O mapa foi comprimido e sincronizado pelo Firestore.`
          : 'Servidor e Storage indisponíveis. O mapa foi comprimido e sincronizado pelo Firestore.',
      );
    } catch (err) {
      console.error('Erro ao carregar mapa:', err);
      setAvisoMesa(err?.message || 'Não foi possível carregar o mapa. Tente outra imagem.');
    }
  };

  const handleMapaCarregado = useCallback(async ({ largura, altura }) => {
    setTamanhoPalco({ largura, altura });
    setMapaImagemCarregado(true);
    if (db && sessaoAtiva) {
      try {
        await setDoc(doc(db, 'sessoes', sessaoAtiva, 'estado', 'mapa'), {
          largura,
          altura,
          atualizadoEm: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error('Erro ao salvar tamanho do mapa:', err);
      }
    }
  }, [sessaoAtiva]);

  const alterarPermissaoJogador = async (jogador, permissao, permitido) => {
    if (!db || !jogador.id) return;
    setErroPermissao('');
    try {
      await updateDoc(doc(db, 'sessoesMembros', jogador.id), { [permissao]: permitido });
    } catch (err) {
      console.error('Erro ao atualizar permissão do jogador:', err);
      setErroPermissao(`Não foi possível salvar a permissão (${err?.code || 'firestore/unknown'}).`);
    }
  };

  // Controle de Zoom e Pan 🔍
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

  // Cálculo da Régua de Medição 📐
  const calcularDistancia = (ponto1, ponto2) => {
    if (!ponto1 || !ponto2) return 0;
    const dx = ponto2.x - ponto1.x;
    const dy = ponto2.y - ponto1.y;
    const distanciaEmPixels = Math.sqrt(dx * dx + dy * dy);
    const quantidadeQuadrados = distanciaEmPixels / TAMANHO_GRID;
    return (quantidadeQuadrados * METROS_POR_QUADRADO).toFixed(1);
  };

  // Borracha: remove traços, formas e textos sob o ponteiro e persiste a exclusão.
  const apagarComBorracha = (pos) => {
    const removidos = anotacoes.filter((item) => {
      if (item.tipo === 'traco') {
        const pontos = item.pontos || [];
        const ox = item.offsetX || 0;
        const oy = item.offsetY || 0;
        const tolerancia = Math.max(12, (item.espessura || 6) + 8);
        for (let i = 0; i < pontos.length; i += 2) {
          if (Math.hypot(pontos[i] + ox - pos.x, pontos[i + 1] + oy - pos.y) < tolerancia) return true;
        }
        return false;
      }
      if (item.tipo === 'forma') {
        const largura = item.largura || 0;
        const altura = item.altura || 0;
        return pos.x >= item.x - 10 && pos.x <= item.x + largura + 10 &&
          pos.y >= item.y - 10 && pos.y <= item.y + altura + 10;
      }
      if (item.tipo === 'texto') {
        const largura = item.boxWidth || 200;
        const altura = item.boxHeight || 60;
        return pos.x >= item.x && pos.x <= item.x + largura && pos.y >= item.y && pos.y <= item.y + altura;
      }
      return false;
    });
    if (removidos.length === 0) return;
    const ids = new Set(removidos.map((item) => item.id));
    setAnotacoes((atuais) => atuais.filter((item) => !ids.has(item.id)));
    setAnotacoesSelecionadas((atuais) => atuais.filter((id) => !ids.has(id)));
    if (ids.has(anotacaoSelecionada)) setAnotacaoSelecionada(null);
    excluirAnotacoes(sessaoAtiva, [...ids]);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      {avisoMesa && (
        <div className="mesa-aviso" role="status">
          <span>{avisoMesa}</span>
          <button type="button" onClick={() => setAvisoMesa(null)} aria-label="Fechar aviso">×</button>
        </div>
      )}

      <MesaToolbar
        onPerfil={() => navigate('/perfil')}
        onSessoes={() => navigate('/sessoes')}
        medindo={medindo}
        ferramenta={ferramenta}
        formaDesenho={formaDesenho}
        onFormaDesenhoChange={setFormaDesenho}
        corAnotacao={corAnotacao}
        espessuraTraco={espessuraTraco}
        quantidadeAnotacoes={anotacoes.length}
        quantidadeAnotacoesSelecionadas={anotacoesSelecionadas.length}
        mostrarOpcoesAnotacao={abrirPainelAnotacao}
        anotacaoSelecionada={anotacoes.find((item) => item.id === anotacaoSelecionada) || null}
        onAnotacaoChange={(id, alteracoes) => {
          const atual = anotacoes.find((item) => item.id === id);
          if (atual) {
            setAnotacoes((atuais) => atuais.map((item) => (item.id === id ? { ...item, ...alteracoes } : item)));
            salvarAnotacao(sessaoAtiva, { ...atual, ...alteracoes });
          }
          setEditorTexto((atualEditor) => (atualEditor?.id === id ? { ...atualEditor, ...alteracoes } : atualEditor));
        }}
        onDeselecionarAnotacao={() => setAnotacaoSelecionada(null)}
        nevoaAtiva={nevoa.ativo}
        nevoaClareada={Object.keys(nevoa.celulas).length}
        modoNevoa={modoNevoa}
        onModoNevoaChange={setModoNevoa}
        onCobrirNevoa={cobrirTudoNevoa}
        onRevelarNevoa={revelarTudoNevoa}
        onDefinirNevoaAtiva={definirNevoaAtiva}
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
          if (!anotacaoSelecionada) return;
          const id = anotacaoSelecionada;
          setAnotacoes((atuais) => atuais.filter((item) => item.id !== id));
          setAnotacoesSelecionadas((atuais) => atuais.filter((itemId) => itemId !== id));
          setAnotacaoSelecionada(null);
          setAbrirPainelAnotacao(false);
          excluirAnotacao(sessaoAtiva, id);
        }}
        onFerramentaChange={(proxima) => {
          const novaFerramenta = ferramenta === proxima && proxima !== 'selecionar' ? 'selecionar' : proxima;
          if (ferramenta === 'texto' && novaFerramenta !== 'texto' && editorTexto) salvarTextoCanvas();
          tracoAtual.current = null;
          formaAtual.current = null;
          desenhoPreviewRef.current?.clear();
          setFerramenta(novaFerramenta);
          setMedindo(false);
          setPontoInicial(null);
          setPontoAtual(null);
          setTokensSelecionados([]);
          if (novaFerramenta === 'texto' && anotacaoSelecionada) {
            const a = anotacoes.find((x) => x.id === anotacaoSelecionada);
            if (a && a.tipo === 'texto') setAbrirPainelAnotacao(true);
          }
          if (novaFerramenta === 'nevoa') {
            setAnotacaoSelecionada(null);
            setAnotacoesSelecionadas([]);
            setAbrirPainelAnotacao(false);
          }
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
      {sessaoAtiva && (
        <aside className="mesa-jogadores" aria-label="Jogadores da campanha">
          <h2><Users size={16} /> Jogadores <span>{jogadoresMesa.length}</span></h2>
          {jogadoresMesa.length ? (
            <ul>{jogadoresMesa.map((jogador) => (
              <li key={jogador.id}>
                <button className="mesa-jogadores__selecionar" type="button" onClick={() => { setErroPermissao(''); setJogadorPermissoes(jogador); }}>
                  {jogador.nome || jogador.email || 'Jogador'}
                </button>
              </li>
            ))}</ul>
          ) : <p>Nenhum jogador entrou ainda.</p>}
        </aside>
      )}
      {jogadorPermissoes && (
        <div className="permissoes-jogador__fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) setJogadorPermissoes(null); }}>
          <section className="permissoes-jogador" role="dialog" aria-modal="true" aria-labelledby="permissoes-jogador-titulo">
            <header>
              <div><span>PERMISSÕES</span><h2 id="permissoes-jogador-titulo">{jogadorPermissoes.nome || jogadorPermissoes.email || 'Jogador'}</h2></div>
              <button type="button" onClick={() => setJogadorPermissoes(null)} aria-label="Fechar"><X size={17} /></button>
            </header>
            <label><Move size={16} /><input type="checkbox" checked={Boolean(jogadorPermissoes.podeMover)} onChange={(e) => {
              const permitido = e.target.checked;
              setJogadorPermissoes((atual) => ({ ...atual, podeMover: permitido }));
              alterarPermissaoJogador(jogadorPermissoes, 'podeMover', permitido);
            }} /> Pode mover itens no mapa</label>
            <label><UserRoundPlus size={16} /><input type="checkbox" checked={Boolean(jogadorPermissoes.podeAdicionar)} onChange={(e) => {
              const permitido = e.target.checked;
              setJogadorPermissoes((atual) => ({ ...atual, podeAdicionar: permitido }));
              alterarPermissaoJogador(jogadorPermissoes, 'podeAdicionar', permitido);
            }} /> Pode colocar tokens no mapa</label>
            {erroPermissao && <p className="mesa-jogadores__erro" role="alert">{erroPermissao}</p>}
          </section>
        </div>
      )}
      {(erroUploadMapa || erroCarregarMapa || enviandoMapa) && (
        <p className={`mapa-upload-status${erroUploadMapa || erroCarregarMapa ? ' mapa-upload-status--erro' : ''}`} role={erroUploadMapa || erroCarregarMapa ? 'alert' : 'status'}>
          {erroUploadMapa || (erroCarregarMapa ? 'O mapa foi encontrado, mas a imagem não carregou. Tente enviar a imagem novamente.' : 'Salvando mapa...')}
        </p>
      )}
      {janelaManager &&(
        <PainelManager
          isOpen={janelaManager}
          onClose={() => setJanelaManager(false)}
          tokens={tokens}
          selecionados={tokensSelecionados}
          onSelecionarToken={selecionarTokenPeloPainel}
          onAlterarVida={alterarVidaToken}
          onExcluirToken={removerToken}
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
        const atualizarToken = (alteracoes, persistir = true) => {
          setTokens((atuais) => atuais.map((item) => (item.id === token.id ? { ...item, ...alteracoes } : item)));
          if (persistir) salvarToken(sessaoAtiva, { id: token.id, ...alteracoes });
        };
        const persistirToken = () => {
          const atual = tokensRef.current.find((item) => item.id === token.id);
          if (atual) salvarToken(sessaoAtiva, atual);
        };
        const fechar = () => { setHpInputMenu(''); setMenuToken(null); };
        return (
          <div className="token-contextual" style={{ left: menuToken.x, top: menuToken.y }} onMouseDown={(e) => e.stopPropagation()}>
            <strong>Token {token.nome}</strong>
            <label className="token-contextual__nome">
              Nome
              <input
                type="text"
                value={token.nome || ''}
                onChange={(e) => atualizarToken({ nome: e.target.value }, false)}
                onBlur={persistirToken}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    persistirToken();
                    fechar();
                  }
                }}
                aria-label="Nome do token"
              />
            </label>
            <label className="token-contextual__vida">
              <span>Vida atual</span>
              <div className="token-contextual__vida-controle">
                <input
                  className="token-contextual__vida-input"
                  aria-label="Vida atual do token"
                  title="Use +N para curar/buff, -N para ferir, =N para definir e =-N para definir negativo"
                  value={hpInputMenu}
                  placeholder={String(token.vida ?? 0)}
                  onChange={(e) => setHpInputMenu(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const atual = Number(token.vida) || 0;
                      const maximo = Number(token.vidamax) || Math.max(0, atual) || 0;
                      const txt = hpInputMenu.trim();
                      if (txt === '') { setHpInputMenu(''); return; }
                      let novaVida;
                      if (txt.startsWith('+')) {
                        novaVida = atual + (Number(txt.slice(1)) || 0);
                      } else if (txt.startsWith('-')) {
                        novaVida = atual - (Number(txt.slice(1)) || 0);
                      } else if (txt.startsWith('=')) {
                        // "=" define um valor absoluto, inclusive negativo: "=-7".
                        novaVida = Number(txt.slice(1)) || 0;
                      } else {
                        novaVida = Number(txt) || 0;
                      }
                      // Vida atual livre: pode ficar negativa ou acima do máximo (buff),
                      // sem nunca alterar a vida máxima.
                      atualizarToken({ vida: novaVida, vidamax: maximo });
                      setHpInputMenu('');
                      fechar();
                    }
                  }}
                />
                <span>{token.vida ?? 0}/{token.vidamax ?? token.vida ?? 0} PV {hpInputMenu ? `[${hpInputMenu}]` : ''}</span>
              </div>
            </label>
            <label className="token-contextual__cor">Cor <input type="color" value={token.cor || '#ff0044'} onChange={(e) => atualizarToken({ cor: e.target.value, imagem: null })} /></label>
            <button onClick={() => { atualizarToken({ escala: Math.min(4, (token.escala || 1) + 0.25) }); fechar(); }}>Aumentar tamanho</button>
            <button onClick={() => { atualizarToken({ escala: Math.max(0.25, (token.escala || 1) - 0.25) }); fechar(); }}>Diminuir tamanho</button>
            <button onClick={() => {
              const copia = {
                ...token,
                id: novoId(),
                x: Math.min(tamanhoPalco.largura - 25, token.x + TAMANHO_GRID),
                y: Math.min(tamanhoPalco.altura - 25, token.y + TAMANHO_GRID),
              };
              setTokens((atuais) => [...atuais, copia]);
              salvarToken(sessaoAtiva, copia);
              fechar();
            }}>Duplicar token</button>
            <button className="token-contextual__excluir" onClick={() => {
              removerToken(token.id);
              fechar();
            }}>Excluir token</button>
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
        draggable={false}
        onClick={(e) => {
          if (ferramenta === 'desenhar') return;
          if (ferramenta === 'texto') return;
          if (ferramenta === 'nevoa') return;
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
          if (e.evt.button === 2) {
            const stage = e.target.getStage();
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
          if (e.evt.button === 0 && ferramenta === 'texto' && e.target === e.target.getStage() && !editorTexto) {
            const pos = e.target.getStage().getRelativePointerPosition();
            setEditorTexto({ id: novoId(), x: pos.x, y: pos.y, texto: '', cor: corAnotacao, fontFamily: fonteAnotacao, fontSize: tamanhoFonte, boxWidth: 200, boxHeight: 60 });
            return;
          }
          if (e.evt.button === 0 && ferramenta === 'nevoa') {
            nevoaEditandoRef.current = true;
            pintarNevoa(e.target.getStage().getRelativePointerPosition());
            return;
          }
          // Arrastar em uma área vazia cria uma seleção retangular.
          if (e.evt.button === 0 && !medindo && ferramenta === 'selecionar' && e.target === e.target.getStage()) {
            const stage = e.target.getStage();
            const pos = stage.getRelativePointerPosition();
            selecaoPendente.current = true;
            setSelecaoArea({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, adicionar: e.evt.shiftKey });
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
          if (e.evt.button === 0 && ferramenta === 'desenhar' && formaDesenho === 'borracha') {
            apagarComBorracha(e.target.getStage().getRelativePointerPosition());
            return;
          }
          if (e.evt.button === 0 && ferramenta === 'desenhar' && e.target === e.target.getStage()) {
            const pos = e.target.getStage().getRelativePointerPosition();
            const id = novoId();
            if (formaDesenho === 'livre') {
              tracoAtual.current = { id, pontos: [pos.x, pos.y], cor: corAnotacao, espessura: espessuraTraco };
              desenhoPreviewRef.current?.update({ tipo: 'traco', pontos: [pos.x, pos.y], cor: corAnotacao, espessura: espessuraTraco });
            } else {
              formaAtual.current = { id, forma: formaDesenho, inicio: pos, cor: corAnotacao, espessura: espessuraTraco };
              desenhoPreviewRef.current?.update({
                ...obterGeometriaForma(formaDesenho, pos, pos),
                tipo: 'forma', forma: formaDesenho, cor: corAnotacao, espessura: espessuraTraco,
              });
            }
          }
        }}
        onMouseMove={(e) => {
          if (panRef.current) {
            const stage = e.target.getStage();
            if (stage) {
              const deltaX = e.evt.clientX - panRef.current.clientX;
              const deltaY = e.evt.clientY - panRef.current.clientY;
              if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
                panMoveuRef.current = true;
                panRef.current.moveu = true;
                setMenuToken(null);
              }
              stage.position({
                x: panRef.current.stageX + deltaX,
                y: panRef.current.stageY + deltaY,
              });
              stage.batchDraw();
            }
            return;
          }
          if (ferramenta === 'texto') e.target.getStage().container().style.cursor = 'text';
          if (ferramenta === 'desenhar') {
            e.target.getStage().container().style.cursor = 'crosshair';
          }
          if (ferramenta === 'nevoa') {
            e.target.getStage().container().style.cursor = 'crosshair';
            if (e.evt.buttons === 1) {
              pintarNevoa(e.target.getStage().getRelativePointerPosition());
            }
          }
          if (ferramenta === 'desenhar' && formaDesenho === 'borracha' && e.evt.buttons === 1) {
            apagarComBorracha(e.target.getStage().getRelativePointerPosition());
          }
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
            const desenho = tracoAtual.current;
            const ultimoX = desenho.pontos[desenho.pontos.length - 2];
            const ultimoY = desenho.pontos[desenho.pontos.length - 1];
            if (Math.hypot(pos.x - ultimoX, pos.y - ultimoY) * e.target.getStage().scaleX() >= 1.5) {
              desenho.pontos.push(pos.x, pos.y);
              desenhoPreviewRef.current?.update({ ...desenho, tipo: 'traco', pontos: [...desenho.pontos] });
            }
          }
          if (formaAtual.current) {
            const { forma, inicio, cor, espessura } = formaAtual.current;
            const ponteiro = e.target.getStage().getRelativePointerPosition();
            const geometria = obterGeometriaForma(forma, inicio, ponteiro);
            desenhoPreviewRef.current?.update({ ...geometria, tipo: 'forma', forma, cor, espessura });
          }
        }}
        onMouseUp={(e) => {
          if (panRef.current) {
            panRef.current = null;
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'default';
            return;
          }
          if (ferramenta === 'nevoa' && e.evt.button === 0 && nevoaEditandoRef.current) {
            nevoaEditandoRef.current = false;
            finalizarSalvarNevoa(sessaoAtiva);
          }
          if (selecaoArea && e.evt.button === 0) finalizarSelecaoArea();
          if (e.evt.button === 2) {
            const stage = e.target.getStage();
            stage.draggable(false);
          }
          if (medindo && e.evt.button === 0) {
            //setPontoInicial(null);
            //setPontoAtual(null);
          }
          if (e.evt.button === 0) {
            if (tracoAtual.current && tracoAtual.current.pontos.length >= 4) {
              const traco = tracoAtual.current;
              const novoTraco = { id: traco.id, tipo: 'traco', ...traco };
              setAnotacoes((atuais) => [...atuais, novoTraco]);
              salvarAnotacao(sessaoAtiva, novoTraco);
            }
            if (formaAtual.current) {
              const desenho = formaAtual.current;
              const ponteiro = e.target.getStage().getRelativePointerPosition();
              const geometria = obterGeometriaForma(desenho.forma, desenho.inicio, ponteiro);
              if (Math.max(geometria.largura, geometria.altura) >= 2) {
                const novaForma = {
                  id: desenho.id, tipo: 'forma', forma: desenho.forma,
                  ...geometria, cor: desenho.cor, espessura: desenho.espessura,
                };
                setAnotacoes((atuais) => [...atuais, novaForma]);
                salvarAnotacao(sessaoAtiva, novaForma);
              }
            }
            tracoAtual.current = null;
            formaAtual.current = null;
            desenhoPreviewRef.current?.clear();
          }
        }}
      >
        {/* Camada 1: Mapa de Imagem 🖼️ */}
        <Layer>
          {urlMapa && <MapaImagem url={urlMapa} onMapaCarregado={handleMapaCarregado} onErro={() => setErroCarregarMapa(true)} />}
        </Layer>

        {/* Camada 2: Grid 📐 */}
        <GridLayer
          largura={tamanhoPalco.largura}
          altura={tamanhoPalco.altura}
          tamanhoCelula={TAMANHO_GRID}
        />

        {/* Camada de desenho e escrita */}
        <Layer listening={ferramenta !== 'desenhar' && ferramenta !== 'nevoa' && !medindo}>
          <DrawingPreview ref={desenhoPreviewRef} />
          {anotacoes.map((item) => item.tipo === 'traco' ? (
            <Line key={item.id} ref={(node) => { if (node) anotacaoNodeRefs.current.set(item.id, node); else anotacaoNodeRefs.current.delete(item.id); }}
              points={item.pontos} stroke={item.cor} strokeWidth={item.espessura}
              x={item.offsetX || 0} y={item.offsetY || 0}
              listening={ferramenta === 'selecionar' && !medindo}
              shadowColor={anotacoesSelecionadas.includes(item.id) ? '#53a9ff' : undefined}
              shadowBlur={anotacoesSelecionadas.includes(item.id) ? 8 : 0}
              draggable={ferramenta === 'selecionar' && !medindo}
              lineCap="round" lineJoin="round" hitStrokeWidth={Math.max(16, item.espessura + 10)}
              onClick={(e) => selecionarAnotacao(e, item.id)}
              onDragStart={(e) => iniciarArrasteAnotacao(e, item)} onDragMove={moverAnotacaoSelecionada} onDragEnd={finalizarArrasteAnotacao} />
          ) : item.tipo === 'forma' ? (
            <Group key={item.id} ref={(node) => { if (node) anotacaoNodeRefs.current.set(item.id, node); else anotacaoNodeRefs.current.delete(item.id); }}
              x={item.x} y={item.y} draggable={ferramenta === 'selecionar' && !medindo}
              onClick={(e) => selecionarAnotacao(e, item.id)}
              onDragStart={(e) => iniciarArrasteAnotacao(e, item)} onDragMove={moverAnotacaoSelecionada} onDragEnd={finalizarArrasteAnotacao}>
              {item.forma === 'circulo' ? (
                <Ellipse x={item.largura / 2} y={item.altura / 2} radiusX={item.largura / 2} radiusY={item.altura / 2}
                  stroke={item.cor} strokeWidth={item.espessura} />
              ) : item.forma === 'quadrado' || item.forma === 'retangulo' ? (
                <Rect width={item.largura} height={item.altura} stroke={item.cor} strokeWidth={item.espessura} />
              ) : (
              <Line points={item.pontos} closed={item.forma === 'triangulo' || item.forma === 'estrela'} fill="rgba(0,0,0,0)"
                  stroke={item.cor} strokeWidth={item.espessura} lineCap="round" lineJoin="round" />
              )}
              {anotacoesSelecionadas.includes(item.id) && <Rect width={item.largura} height={item.altura}
                stroke="#53a9ff" strokeWidth={1} dash={[5, 4]} listening={false} />}
            </Group>
          ) : item.id === editorTexto?.id ? null : (
            <Group key={item.id} ref={(node) => { if (node) anotacaoNodeRefs.current.set(item.id, node); else anotacaoNodeRefs.current.delete(item.id); }}
              x={item.x} y={item.y} draggable={ferramenta === 'selecionar' && !medindo}
              onClick={(e) => {
                if (ferramenta === 'texto') {
                  e.cancelBubble = true;
                  setAnotacaoSelecionada(item.id);
                  setAnotacoesSelecionadas([item.id]);
                  setAbrirPainelAnotacao(true);
                  return;
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
                  onDragEnd={() => { finalizarSalvarAnotacao(item.id); }}
                  onMouseEnter={(e) => { e.target.getStage().container().style.cursor = 'nwse-resize'; }}
                  onMouseLeave={(e) => { e.target.getStage().container().style.cursor = 'default'; }} />;
              })()}
            </Group>
          ))}
        </Layer>

        {/* Camada de névoa: segue o grid e fica acima do mapa/anotações, abaixo dos tokens */}
        <FogLayer
          largura={tamanhoPalco.largura}
          altura={tamanhoPalco.altura}
          ativo={nevoa.ativo}
          celulas={nevoa.celulas}
          tamanhoCelula={TAMANHO_GRID}
          opacidadeMaxima={0.6}
        />

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
              ref={(node) => { if (node) tokenNodeRefs.current.set(tk.id, node); else tokenNodeRefs.current.delete(tk.id); }}
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
                // Um arraste com o botão direito terminou sobre o token: não abre o menu.
                if (panMoveuRef.current) {
                  panMoveuRef.current = false;
                  return;
                }
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
