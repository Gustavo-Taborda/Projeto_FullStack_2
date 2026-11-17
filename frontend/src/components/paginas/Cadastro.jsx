// Tela de cadastro de usuário.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { mensagemDeErro, errosDosCampos } from '../../services/api';
import { mascaraCpf } from '../../services/formatacao';
import Campo from '../Campo';

// Validação no cliente (rápida, para o usuário). O servidor valida de novo!
function validar(form) {
  const erros = {};
  if (!form.nome.trim()) erros.nome = 'Informe o nome';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) erros.email = 'E-mail inválido';
  if (form.cpf.replace(/\D/g, '').length !== 11) erros.cpf = 'O CPF deve ter 11 dígitos';
  if (form.senha.length < 8 || !/[a-zA-Z]/.test(form.senha) || !/[0-9]/.test(form.senha)) {
    erros.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números';
  }
  if (form.senha !== form.confirmacaoSenha) erros.confirmacaoSenha = 'As senhas não conferem';
  return erros;
}

export default function Cadastro() {
  const { cadastro } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ nome: '', email: '', cpf: '', senha: '', confirmacaoSenha: '' });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Atualiza um campo do formulário mantendo os outros
  function alterar(campo, valor) {
    setForm({ ...form, [campo]: valor });
  }

  async function cadastrar(evento) {
    evento.preventDefault();
    setErroGeral('');

    const errosCliente = validar(form);
    setErros(errosCliente);
    if (Object.keys(errosCliente).length > 0) return;

    setEnviando(true);
    try {
      await cadastro(form);
      navigate('/login', { state: { mensagem: 'Cadastro realizado! Faça login.' } });
    } catch (erroDaApi) {
      // Ex.: 409 -> { campos: { email: 'Este e-mail já está cadastrado' } }
      setErros(errosDosCampos(erroDaApi));
      setErroGeral(mensagemDeErro(erroDaApi));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-centro">
      <form className="cartao formulario-auth" onSubmit={cadastrar} noValidate>
        <h1>Criar conta</h1>
        {erroGeral && <p className="estado-erro">{erroGeral}</p>}

        <Campo rotulo="Nome" erro={erros.nome}>
          <input value={form.nome} onChange={(e) => alterar('nome', e.target.value)} />
        </Campo>
        <Campo rotulo="E-mail" erro={erros.email}>
          <input type="email" value={form.email} onChange={(e) => alterar('email', e.target.value)} />
        </Campo>
        <Campo rotulo="CPF" erro={erros.cpf}>
          <input
            value={form.cpf}
            onChange={(e) => alterar('cpf', mascaraCpf(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
          />
        </Campo>
        <Campo rotulo="Senha" erro={erros.senha}>
          <input type="password" value={form.senha} onChange={(e) => alterar('senha', e.target.value)} />
        </Campo>
        <Campo rotulo="Confirmar senha" erro={erros.confirmacaoSenha}>
          <input
            type="password"
            value={form.confirmacaoSenha}
            onChange={(e) => alterar('confirmacaoSenha', e.target.value)}
          />
        </Campo>

        <button type="submit" disabled={enviando}>{enviando ? 'Cadastrando...' : 'Cadastrar'}</button>
        <p>Já tem conta? <Link to="/login">Entrar</Link></p>
      </form>
    </div>
  );
}
