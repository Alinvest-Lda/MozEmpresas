"use client";

import { useActionState } from "react";
import { activatePartnerAccess } from "@/lib/auth/partner-access";
import type { PartnerAccessState } from "@/lib/auth/partner-access";

export function PartnerActivationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<PartnerAccessState, FormData>(activatePartnerAccess, {});

  return (
    <form action={action} style={{ marginTop: 24 }}>
      <input type="hidden" name="token" value={token} />
      <div className="field">
        <label htmlFor="fullName">Nome completo</label>
        <input id="fullName" name="fullName" autoComplete="name" required />
      </div>
      <div className="field">
        <label htmlFor="password">Definir password</label>
        <input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
      </div>
      {state.error && <p role="alert" className="notice" style={{ marginBottom: 16 }}>{state.error}</p>}
      <button className="btn primary full" disabled={pending}>
        {pending ? "A activar..." : "Activar acesso de parceiro"}
      </button>
    </form>
  );
}
