// Cliente HTTP ÚNICO da aplicação. Toda comunicação com a API passa por aqui.
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// ANTES de cada requisição: se existe token salvo, coloca no cabeçalho Authorization
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// DEPOIS de cada resposta: se a API respondeu 401 (token ausente, inválido ou expirado),
// apaga os dados de login e manda o usuário para a tela de login.
// (No próprio login, o 401 significa "senha errada", então ali não redirecionamos.)
api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const ehTelaDeLogin = erro.config?.url?.includes('/auth/login');
    if (erro.response?.status === 401 && !ehTelaDeLogin) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(erro);
  }
);

// Mensagem geral do erro (padrão da API: { mensagem, campos })
export function mensagemDeErro(erro) {
  return erro.response?.data?.mensagem || 'Não foi possível conectar ao servidor';
}

// Mensagens por campo, ex.: { email: 'Este e-mail já está cadastrado' }
export function errosDosCampos(erro) {
  return erro.response?.data?.campos || {};
}

export default api;
