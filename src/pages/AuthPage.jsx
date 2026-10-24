import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Dices } from 'lucide-react';
import { auth } from '../auth/firebase.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { getAuthErrorMessage } from '../auth/authUtils.js';

export default function AuthPage({ mode }) {
  const signup = mode === 'signup';
  const { user, configured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!configured || !auth) {
      setError('Não foi possível conectar ao serviço de autenticação. Confira a configuração do Firebase.');
      return;
    }
    setBusy(true);
    try {
      if (signup) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setBusy(false);
    }
  };

  return <main className="auth-page">
    <header className="auth-simple-header">
      <Link className="auth-brand" to="/login" aria-label="VTT, página inicial">
        <span className="auth-mark"><Dices size={19} strokeWidth={1.8} /></span>
        <span>VTT</span>
      </Link>
      <div className="auth-simple-switch">
        <span>{signup ? 'Já tem uma conta?' : 'Ainda não tem conta?'}</span>
        <Link to={signup ? '/login' : '/cadastro'}>{signup ? 'Entrar' : 'Criar conta'}</Link>
      </div>
    </header>
    <section className="auth-panel">
      <div className="auth-form-wrap">
        <Card className="auth-card">
          <CardHeader className="auth-card-header">
            <CardTitle className="auth-card-title">{signup ? 'Criar conta' : 'Entrar'}</CardTitle>
            <CardDescription className="auth-card-description">
              {signup ? 'Crie seu acesso para usar a mesa.' : 'Entre com seu e-mail e senha.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="auth-card-content">
            <form className="auth-form" onSubmit={submit}>
              <div className="auth-form-field">
                <Label htmlFor="email" className="auth-label">E-mail</Label>
                <Input id="email" className="auth-input" type="email" autoComplete="email" placeholder="nome@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="auth-form-field">
                <div className="auth-password-label">
                  <Label htmlFor="password" className="auth-label">Senha</Label>
                  {!signup && <span className="auth-password-hint">Mínimo de 6 caracteres</span>}
                </div>
                <Input id="password" className="auth-input" type="password" autoComplete={signup ? 'new-password' : 'current-password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              </div>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <Button className="auth-submit-button" type="submit" disabled={busy}>
                {busy ? 'Aguarde…' : signup ? 'Criar conta' : 'Entrar'}
                {!busy && <ArrowRight size={16} />}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="auth-card-footer">
            <span>Ao continuar, você acessa sua mesa VTT.</span>
          </CardFooter>
        </Card>
      </div>
    </section>
  </main>;
}
