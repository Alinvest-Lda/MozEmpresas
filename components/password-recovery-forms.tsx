"use client";

import { useActionState } from "react";
import {
  requestPasswordReset,
  setRecoveredPassword,
  type RecoveryState,
} from "@/lib/auth/recovery-actions";

export function PasswordRecoveryRequestForm() {
  const [state, action, pending] = useActionState<RecoveryState, FormData>(requestPasswordReset, {});
  return (
    <form action={action} style={{ marginTop: 24 }}>
      <div className="field">
        <label htmlFor="recovery-email">Email da conta</label>
        <input id="recovery-email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.error && <p role="alert" className="notice" style={{ marginBottom: 16 }}>{state.error}</p>}
      {state.success && <p role="status" className="account-success" style={{ marginBottom: 16 }}>{state.success}</p>}
      <button className="btn primary full" disabled={pending}>
        {pending ? "A solicitar..." : "Enviar instruções"}
      </button>
    </form>
  );
}

export function SetRecoveredPasswordForm() {
  const [state, action, pending] = useActionState<RecoveryState, FormData>(setRecoveredPassword, {});
  return (
    <form action={action} style={{ marginTop: 24 }}>
      <div className="field">
        <label htmlFor="new-password">Nova password</label>
        <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="field">
        <label htmlFor="confirm-password">Confirmar nova password</label>
        <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state.error && <p role="alert" className="notice" style={{ marginBottom: 16 }}>{state.error}</p>}
      <button className="btn primary full" disabled={pending}>
        {pending ? "A actualizar..." : "Guardar nova password"}
      </button>
    </form>
  );
}
