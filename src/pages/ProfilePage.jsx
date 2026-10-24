import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { ArrowLeft, CalendarDays, Check, Clock3, Copy, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { auth } from '../auth/firebase.js';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx';
import './profile.css';
import './profile-actions.css';

const nomesProvedores = {
  password: 'E-mail e senha',
  'google.com': 'Google',
  'facebook.com': 'Facebook',
  'github.com': 'GitHub',
  'apple.com': 'Apple',
  'twitter.com': 'X / Twitter',
};

function formatarData(valor) {
  if (!valor) return 'Não disponível';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Não disponível';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(data);
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copiado, setCopiado] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [erroSaida, setErroSaida] = useState('');
  const nome = user.displayName || 'Nome não informado';
  const email = user.email || 'E-mail não informado';
  const iniciais = (user.displayName || user.email || 'V')
    .split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((parte) => parte[0].toUpperCase()).join('');
  const provedores = [...new Set((user.providerData || []).map((item) => nomesProvedores[item.providerId] || item.providerId))];

  const copiarUid = async () => {
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      setCopiado(false);
    }
  };

  const sair = async () => {
    setErroSaida('');
    setSaindo(true);
    try {
      await signOut(auth);
      navigate('/login', { replace: true });
    } catch {
      setErroSaida('Não foi possível encerrar a sessão. Tente novamente.');
      setSaindo(false);
    }
  };

  return <main className="profile-page">
    <header className="profile-topbar">
      <Link className="profile-back" to="/"><ArrowLeft size={17} /> Voltar à mesa</Link>
      <span className="profile-wordmark">VTT</span>
    </header>
    <section className="profile-content">
      <div className="profile-heading">
        <p>CONTA</p>
        <h1>Meu perfil</h1>
        <span>Informações da sua conta VTT.</span>
      </div>

      <Card className="profile-card">
        <CardHeader className="profile-card-header">
          <div className="profile-avatar" aria-hidden="true">{iniciais}</div>
          <div className="profile-identity">
            <CardTitle className="profile-name">{nome}</CardTitle>
            <CardDescription className="profile-email"><Mail size={14} /> {email}</CardDescription>
          </div>
          <span className={user.emailVerified ? 'profile-status profile-status--verified' : 'profile-status'}>
            <i />{user.emailVerified ? 'E-mail verificado' : 'E-mail não verificado'}
          </span>
        </CardHeader>
        <CardContent className="profile-details">
          <div className="profile-detail">
            <span><UserRound size={15} /> ID da conta</span>
            <div className="profile-uid"><code>{user.uid}</code>
              <Button className="profile-copy" type="button" variant="ghost" size="icon-sm" onClick={copiarUid} aria-label="Copiar ID da conta" title="Copiar ID">
                {copiado ? <Check size={15} /> : <Copy size={15} />}
              </Button>
            </div>
          </div>
          <div className="profile-detail">
            <span><ShieldCheck size={15} /> Método de acesso</span>
            <strong>{provedores.length ? provedores.join(', ') : 'Não informado'}</strong>
          </div>
          <div className="profile-detail">
            <span><CalendarDays size={15} /> Conta criada</span>
            <strong>{formatarData(user.metadata?.creationTime)}</strong>
          </div>
          <div className="profile-detail">
            <span><Clock3 size={15} /> Último acesso</span>
            <strong>{formatarData(user.metadata?.lastSignInTime)}</strong>
          </div>
        </CardContent>
      </Card>
      <div className="profile-actions">
        {erroSaida && <p className="profile-error" role="alert">{erroSaida}</p>}
        <Button className="profile-logout" type="button" variant="outline" onClick={sair} disabled={saindo}>
          <LogOut size={16} />{saindo ? 'Saindo…' : 'Sair da conta'}
        </Button>
      </div>
    </section>
  </main>;
}
