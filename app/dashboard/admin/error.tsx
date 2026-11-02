"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(JSON.stringify({
      level: "error",
      event: "admin.segment_error",
      message: error.message,
      digest: error.digest ?? null,
      occurred_at: new Date().toISOString(),
    }));
  }, [error]);

  return (
    <main className="dashboard-main admin-workspace">
      <div className="dashboard-content admin-error-state" role="alert" aria-labelledby="admin-error-title">
        <span className="dashboard-kicker">Administração global</span>
        <h1 id="admin-error-title">Não foi possível carregar esta área.</h1>
        <p>Ocorreu um problema ao processar a informação. Tente novamente; se persistir, contacte o suporte técnico.</p>
        {error.digest ? <small>Referência técnica: <code>{error.digest}</code></small> : null}
        <Button variant="primary" onClick={reset}>Tentar novamente</Button>
      </div>
    </main>
  );
}
