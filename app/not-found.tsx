import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <div className="container auth-card" role="status">
        <span className="eyebrow">Erro 404</span>
        <h1>Página não encontrada</h1>
        <p className="muted">O endereço pode estar incorrecto ou a página já não estar disponível.</p>
        <Link className="btn primary" href="/">Voltar à página inicial</Link>
      </div>
    </main>
  );
}
