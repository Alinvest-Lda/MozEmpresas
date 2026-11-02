"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({
      level: "error",
      event: "app.segment_error",
      message: error.message,
      digest: error.digest ?? null,
      occurred_at: new Date().toISOString(),
    }));
  }, [error]);

  return (
    <main className="page">
      <div className="container auth-card" role="alert" aria-labelledby="error-title">
        <span className="eyebrow">Erro inesperado</span>
        <h1 id="error-title">Não foi possível carregar esta página.</h1>
        <p className="muted">Ocorreu um problema ao processar o pedido. Tente novamente. Se o problema continuar, contacte o suporte.</p>
        {error.digest ? <p className="muted">Referência: <code>{error.digest}</code></p> : null}
        <button className="btn primary" type="button" onClick={reset}>Tentar novamente</button>
      </div>
    </main>
  );
}
