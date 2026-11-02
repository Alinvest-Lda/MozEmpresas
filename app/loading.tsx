export default function Loading() {
  return (
    <main className="page" aria-busy="true" aria-live="polite">
      <div className="container" role="status" aria-label="A carregar conteúdo">
        <span className="eyebrow">MozEmpresas</span>
        <h1>A carregar</h1>
        <p className="muted">Estamos a preparar esta página. Aguarde um momento.</p>
        <div className="loading-placeholder" aria-hidden="true" />
      </div>
    </main>
  );
}
