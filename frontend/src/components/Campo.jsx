// Um campo de formulário: rótulo + input (children) + mensagem de erro embaixo.
export default function Campo({ rotulo, erro, children }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      {children}
      {erro && <small className="erro-campo">{erro}</small>}
    </label>
  );
}
