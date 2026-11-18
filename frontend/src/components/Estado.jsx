// Mostra "Carregando...", a mensagem de erro ou "lista vazia".
// Se nada disso acontecer, mostra o conteúdo normal (children).
export default function Estado({ carregando, erro, vazio, mensagemVazio = 'Nenhum registro encontrado.', children }) {
  if (carregando) return <p className="estado">Carregando...</p>;
  if (erro) return <p className="estado estado-erro">{erro}</p>;
  if (vazio) return <p className="estado">{mensagemVazio}</p>;
  return children;
}
