import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, UserPlus, Dices, Trash2, Copy, Check, KeyRound } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext.jsx';
import { db } from '../auth/firebase.js';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import './sessions.css';

function getTimestamp(valor) {
  if (!valor) return 0;
  if (typeof valor.seconds === 'number') return valor.seconds;
  if (typeof valor.toMillis === 'function') return Math.floor(valor.toMillis() / 1000);
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? 0 : Math.floor(data.getTime() / 1000);
}

function gerarCodigoConvite() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

export default function SessionsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [sessoes, setSessoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [gerandoConvite, setGerandoConvite] = useState({});
  const [convites, setConvites] = useState({});
  const [copiado, setCopiado] = useState('');
  const [codigoEntrada, setCodigoEntrada] = useState('');
  const [entrando, setEntrando] = useState(false);

  const carregar = useCallback(async () => {
    if (authLoading) return;
    if (!db || !user) {
      setCarregando(false);
      setErro(!db ? 'Firestore não está configurado.' : 'Usuário não autenticado.');
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      const q1 = query(collection(db, 'sessoes'), where('mestreId', '==', user.uid));
      const q2 = query(collection(db, 'sessoesMembros'), where('usuarioId', '==', user.uid));
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const minhas = snap1.docs.map((d) => ({ id: d.id, ...d.data(), papel: 'mestre' }));
      const idsMembro = new Set(minhas.map((s) => s.id));
      const comoMembroIds = snap2.docs
        .map((m) => m.data().sessaoId)
        .filter((id) => id && !idsMembro.has(id));
      let membroSessoes = [];
      if (comoMembroIds.length > 0) {
        const todosSnap = await getDocs(collection(db, 'sessoes'));
        membroSessoes = todosSnap.docs
          .filter((d) => comoMembroIds.includes(d.id))
          .map((d) => ({ id: d.id, ...d.data(), papel: 'jogador' }));
      }
      const todas = [...minhas, ...membroSessoes].sort((a, b) => getTimestamp(b.criadoEm) - getTimestamp(a.criadoEm));
      setSessoes(todas);
    } catch (e) {
      console.error('Erro ao carregar sessões:', e);
      setErro(e?.message || 'Não foi possível carregar as sessões.');
    } finally {
      setCarregando(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const criarSessao = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    if (!db || !user) {
      setErro('Serviço indisponível.');
      return;
    }
    if (!nome.trim()) {
      setErro('Informe um nome para a sessão.');
      return;
    }
    setCriando(true);
    try {
      const docRef = await addDoc(collection(db, 'sessoes'), {
        nome: nome.trim(),
        descricao: descricao.trim(),
        mestreId: user.uid,
        mestreEmail: user.email,
        criadoEm: serverTimestamp(),
      });
      await setDoc(doc(db, 'sessoesMembros', `${docRef.id}_${user.uid}`), {
        sessaoId: docRef.id,
        usuarioId: user.uid,
        email: user.email,
        papel: 'mestre',
        adicionadoEm: serverTimestamp(),
      });
      setNome('');
      setDescricao('');
      setSucesso('Sessão criada com sucesso!');
      carregar();
    } catch (e) {
      console.error('Erro ao criar sessão:', e);
      setErro('Erro ao criar sessão. Verifique as regras do Firestore.');
    } finally {
      setCriando(false);
    }
  };

  const gerarConvite = async (sessaoId) => {
    setErro('');
    setSucesso('');
    if (!db || !user) {
      setErro('Serviço indisponível.');
      return;
    }
    setGerandoConvite((g) => ({ ...g, [sessaoId]: true }));
    try {
      let codigo = gerarCodigoConvite();
      let existe = true;
      let tentativas = 0;
      while (existe && tentativas < 10) {
        const snap = await getDocs(query(collection(db, 'convites'), where('codigo', '==', codigo)));
        existe = !snap.empty;
        if (existe) {
          codigo = gerarCodigoConvite();
          tentativas += 1;
        }
      }
      await addDoc(collection(db, 'convites'), {
        sessaoId,
        codigo,
        convidadoPor: user.uid,
        convidadoPorEmail: user.email,
        status: 'pendente',
        criadoEm: serverTimestamp(),
      });
      setConvites((c) => ({ ...c, [sessaoId]: codigo }));
      setSucesso('Código de convite gerado!');
    } catch (e) {
      console.error('Erro ao gerar convite:', e);
      setErro(e?.message || 'Erro ao gerar convite.');
    } finally {
      setGerandoConvite((g) => ({ ...g, [sessaoId]: false }));
    }
  };

  const copiarCodigo = async (codigo) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(codigo);
      window.setTimeout(() => setCopiado(''), 1600);
    } catch {
      setCopiado('');
    }
  };

  const entrarComCodigo = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    if (!db || !user) {
      setErro('Serviço indisponível.');
      return;
    }
    const codigo = codigoEntrada.trim().toUpperCase();
    if (!codigo) {
      setErro('Informe o código de convite.');
      return;
    }
    setEntrando(true);
    try {
      const q = query(collection(db, 'convites'), where('codigo', '==', codigo));
      const snap = await getDocs(q);
      if (snap.empty) {
        setErro('Código de convite inválido ou expirado.');
        setEntrando(false);
        return;
      }
      const conviteDoc = snap.docs[0];
      const convite = conviteDoc.data();
      if (convite.status && convite.status !== 'pendente') {
        setErro('Este convite já foi utilizado.');
        setEntrando(false);
        return;
      }
      const sessaoId = convite.sessaoId;
      await setDoc(doc(db, 'sessoesMembros', `${sessaoId}_${user.uid}`), {
        sessaoId,
        usuarioId: user.uid,
        email: user.email,
        papel: 'jogador',
        adicionadoEm: serverTimestamp(),
      });
      try {
        await updateDoc(doc(db, 'convites', conviteDoc.id), {
          status: 'usado',
          usadoPor: user.uid,
          usadoEm: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Não foi possível atualizar convite:', e);
      }
      setCodigoEntrada('');
      setSucesso('Entrando na mesa...');
      navigate(`/jogador/${sessaoId}`);
    } catch (e) {
      console.error(e);
      setErro(e?.message || 'Erro ao entrar na sessão.');
      setEntrando(false);
    }
  };

  const excluirSessao = async (sessaoId) => {
    setErro('');
    setSucesso('');
    if (!db || !user) {
      setErro('Serviço indisponível.');
      return;
    }
    const confirmar = window.confirm('Tem certeza que deseja excluir esta sessão?');
    if (!confirmar) return;
    try {
      await deleteDoc(doc(db, 'sessoes', sessaoId));
      try {
        const membrosSnap = await getDocs(query(collection(db, 'sessoesMembros'), where('sessaoId', '==', sessaoId)));
        await Promise.all(membrosSnap.docs.map((m) => deleteDoc(m.ref)));
      } catch (e) {
        console.warn('Não foi possível limpar membros:', e);
      }
      try {
        const convitesSnap = await getDocs(query(collection(db, 'convites'), where('sessaoId', '==', sessaoId)));
        await Promise.all(convitesSnap.docs.map((c) => deleteDoc(c.ref)));
      } catch (e) {
        console.warn('Não foi possível limpar convites:', e);
      }
      setSucesso('Sessão excluída.');
      carregar();
    } catch (e) {
      console.error('Erro ao excluir sessão:', e);
      setErro(e?.message || 'Erro ao excluir sessão.');
    }
  };

  return (
    <main className="sessions-page">
      <header className="sessions-topbar">
        <span className="sessions-back" style={{ visibility: 'hidden' }}><ArrowLeft size={17} /> Voltar</span>
        <div className="sessions-brand">
          <span className="sessions-mark"><Dices size={18} strokeWidth={1.8} /></span>
          <span>VTT</span>
        </div>
        <Link className="sessions-profile" to="/perfil">Meu perfil</Link>
      </header>
      <section className="sessions-content">
        <div className="sessions-heading">
          <p>SESSÕES</p>
          <h1>Gerenciamento de Sessões</h1>
          <span>Crie sessões, gerencie jogadores e convide pessoas para sua mesa.</span>
        </div>

        {erro && <p className="sessions-error" role="alert">{erro}</p>}
        {sucesso && <p className="sessions-success" role="status">{sucesso}</p>}

        <div className="sessions-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, gridColumn: '1 / span 5' }}>
            <Card className="sessions-card">
              <CardHeader className="sessions-card-header">
                <CardTitle className="sessions-card-title"><Plus size={18} /> Nova sessão</CardTitle>
                <CardDescription>Crie uma nova mesa para sua campanha.</CardDescription>
              </CardHeader>
              <CardContent className="sessions-card-content">
                <form className="sessions-form" onSubmit={criarSessao}>
                  <div className="sessions-form-field">
                    <Label htmlFor="nomeSessao">Nome da sessão *</Label>
                    <Input id="nomeSessao" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: A Maldição de Strahd" required />
                  </div>
                  <div className="sessions-form-field">
                    <Label htmlFor="descSessao">Descrição</Label>
                    <Input id="descSessao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Opcional" />
                  </div>
                  <Button type="submit" disabled={criando || !db || authLoading}>
                    {criando ? 'Criando...' : 'Criar sessão'}
                  </Button>
                  {!db && <p className="sessions-warning">Firestore não configurado. Verifique as credenciais do Firebase.</p>}
                  {db && !user && !authLoading && <p className="sessions-warning">Faça login para criar sessões.</p>}
                </form>
              </CardContent>
            </Card>

            <Card className="sessions-card">
              <CardHeader className="sessions-card-header">
                <CardTitle className="sessions-card-title"><KeyRound size={18} /> Entrar com código</CardTitle>
                <CardDescription>Cole o código de convite enviado pelo mestre.</CardDescription>
              </CardHeader>
              <CardContent className="sessions-card-content">
                <form className="sessions-form" onSubmit={entrarComCodigo}>
                  <div className="sessions-form-field">
                    <Label htmlFor="codigoConvite">Código de convite</Label>
                    <Input id="codigoConvite" value={codigoEntrada} onChange={(e) => setCodigoEntrada(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} />
                  </div>
                  <Button type="submit" disabled={entrando || !db || authLoading}>
                    {entrando ? 'Entrando...' : 'Entrar na sessão'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card className="sessions-card sessions-card--list">
            <CardHeader className="sessions-card-header">
              <CardTitle className="sessions-card-title"><Users size={18} /> Minhas sessões</CardTitle>
              <CardDescription>Gerencie suas sessões e convide jogadores.</CardDescription>
            </CardHeader>
            <CardContent className="sessions-card-content">
              {carregando ? (
                <p className="sessions-loading">Carregando...</p>
              ) : sessoes.length === 0 ? (
                <p className="sessions-empty">Nenhuma sessão ainda. Crie a primeira acima.</p>
              ) : (
                <div className="sessions-list">
                  {sessoes.map((s) => (
                    <article key={s.id} className="session-item">
                      <div className="session-item__header">
                        <div>
                          <h3>{s.nome}</h3>
                          <p>{s.descricao || 'Sem descrição'}</p>
                          <span className={`session-item__badge session-item__badge--${s.papel}`}>{s.papel === 'mestre' ? 'Mestre' : 'Jogador'}</span>
                        </div>
                        {s.papel === 'mestre' && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/mesa/${s.id}`)}>
                              Abrir mesa
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/jogador/${s.id}`)}>
                              Ver como jogador
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => excluirSessao(s.id)} title="Excluir sessão">
                              <Trash2 size={16} /> Excluir
                            </Button>
                          </div>
                        )}
                        {s.papel === 'jogador' && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/jogador/${s.id}`)}>
                              Entrar na mesa
                            </Button>
                          </div>
                        )}
                      </div>
                      {s.papel === 'mestre' && (
                        <div className="session-item__invite">
                          <Label>Código de convite</Label>
                          <div className="session-item__invite-row">
                            <Button onClick={() => gerarConvite(s.id)} disabled={gerandoConvite[s.id]} size="sm">
                              <UserPlus size={16} /> {gerandoConvite[s.id] ? 'Gerando...' : 'Gerar código'}
                            </Button>
                            {convites[s.id] && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <code style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(59,130,246,0.25)', letterSpacing: '0.3em' }}>{convites[s.id]}</code>
                                <Button size="sm" variant="outline" onClick={() => copiarCodigo(convites[s.id])}>
                                  {copiado === convites[s.id] ? <Check size={16} /> : <Copy size={16} />} {copiado === convites[s.id] ? 'Copiado' : 'Copiar'}
                                </Button>
                              </div>
                            )}
                          </div>
                          <small>Envie esse código para o jogador entrar na sessão.</small>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
