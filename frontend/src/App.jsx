// Mapa de rotas (telas) da aplicação.
import { Routes, Route, Navigate } from 'react-router-dom';
import RotaProtegida from './components/RotaProtegida';
import Layout from './components/Layout';
import Login from './components/paginas/Login';
import Cadastro from './components/paginas/Cadastro';
import Dashboard from './components/paginas/Dashboard';

export default function App() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />

      {/* Rotas protegidas: só entra quem está logado. O Layout tem o menu. */}
      <Route
        element={(
          <RotaProtegida>
            <Layout />
          </RotaProtegida>
        )}
      >
        <Route path="/" element={<Dashboard />} />
      </Route>

      {/* Qualquer outro endereço volta para o início */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
