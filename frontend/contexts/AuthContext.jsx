// AuthContext: guarda QUEM está logado e o TOKEN, e oferece login, logout e cadastro.
// Qualquer componente usa com:  const { usuario, login, logout } = useAuth();
import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Lê do localStorage para o login sobreviver ao F5 (recarregar a página)
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [usuario, setUsuario] = useState(() => JSON.parse(localStorage.getItem('usuario') || 'null'));

  async function login(email, senha) {
    const resposta = await api.post('/auth/login', { email, senha });
    localStorage.setItem('token', resposta.data.token);
    localStorage.setItem('usuario', JSON.stringify(resposta.data.usuario));
    setToken(resposta.data.token);
    setUsuario(resposta.data.usuario);
  }

  async function cadastro(dados) {
    await api.post('/auth/cadastro', dados);
  }

  // Logout com JWT = o front simplesmente "esquece" o token
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  }

  const valor = {
    usuario,
    token,
    autenticado: Boolean(token),
    login,
    logout,
    cadastro,
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

// Atalho para usar o contexto
export function useAuth() {
  return useContext(AuthContext);
}
