"use client";

import { useEffect } from "react";
import { logger } from "@/lib/observability/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("app.root_error", {
      component: "app.global_error",
      error_name: error.name,
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <html lang="pt-MZ">
      <body>
        <main style={{ maxWidth: 720, margin: "10vh auto", padding: 24, fontFamily: "Arial, sans-serif" }} role="alert">
          <p><strong>MozEmpresas · Erro inesperado</strong></p>
          <h1>Não foi possível abrir a aplicação.</h1>
          <p>Ocorreu um problema ao preparar a página. Tente novamente ou regresse mais tarde.</p>
          {error.digest ? <p>Referência: <code>{error.digest}</code></p> : null}
          <button type="button" onClick={reset}>Tentar novamente</button>
        </main>
      </body>
    </html>
  );
}
