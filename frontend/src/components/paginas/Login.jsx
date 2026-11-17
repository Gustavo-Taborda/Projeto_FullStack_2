// Tela de login.
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { mensagemDeErro } from '../../services/api';
import Campo from '../Campo';

export default function Login() {
  const { login, autenticado } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Quem já está logado não precisa ver o login
  if (autenticado) {
    return <Navigate to="/" replace />;
  }

  async function entrar(evento) {
    evento.preventDefault(); // impede o navegador de recarregar a página
    setErro('');

    if (!email.trim() || !senha) {
      setErro('Preencha o e-mail e a senha');
      return;
    }

    setEnviando(true);
    try {
      await login(email, senha);
      navigate('/');
    } catch (erroDaApi) {
      setErro(mensagemDeErro(erroDaApi));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-centro">
      <form className="cartao formulario-auth" onSubmit={entrar} noValidate>
        <h1>Entrar</h1>

        {location.state?.mensagem && <p className="sucesso">{location.state.mensagem}</p>}
        {erro && <p className="estado-erro">{erro}</p>}

        <Campo rotulo="E-mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Campo>
        <Campo rotulo="Senha">
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
        </Campo>

        <button type="submit" disabled={enviando}>{enviando ? 'Entrando...' : 'Entrar'}</button>
        <p>Não tem conta? <Link to="/cadastro">Cadastre-se</Link></p>
      </form>
    </div>
  );
}
