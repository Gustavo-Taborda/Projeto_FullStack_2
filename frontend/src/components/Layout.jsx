// Estrutura das telas internas: menu no topo + conteúdo da página (<Outlet />).
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function sair() {
    logout();
    navigate('/login');
  }

  return (
    <div>
      <header className="topo">
        <strong className="marca">💰 Finanças</strong>
        <nav>
          <NavLink to="/" end>Início</NavLink>
          <NavLink to="/lancamentos">Lançamentos</NavLink>
          <NavLink to="/categorias">Categorias</NavLink>
          <NavLink to="/fontes-destinos">Fontes/Destinos</NavLink>
          <NavLink to="/relatorios">Relatórios</NavLink>
          <NavLink to="/faturas">Faturas</NavLink>
        </nav>
        <div className="usuario">
          <span>Olá, {usuario?.nome}</span>
          <button type="button" className="botao-secundario" onClick={sair}>Sair</button>
        </div>
      </header>
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}
