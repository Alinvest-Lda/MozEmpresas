"use client";

import { useActionState } from "react";
import type { AuthState } from "@/lib/auth/actions";

type Props = {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  mode: "login" | "signup";
  next?: string;
};

export function AuthForm({ action, mode, next }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const signup = mode === "signup";

  return (
    <form action={formAction} style={{ marginTop: 24 }}>
      {next && !signup && <input type="hidden" name="next" value={next} />}
      <div className="field">
        <label htmlFor="userType">Tipo de conta</label>
        <select id="userType" name="userType" defaultValue="" required>
          <option value="" disabled>Seleccione uma opção</option>
          <option value="empresa">Representante de empresa</option>
          <option value="profissional">Profissional / Prestador</option>
        </select>
        <small className="muted">
          {signup
            ? "Escolha como irá utilizar o MozEmpresas."
            : "Seleccione o mesmo tipo usado no registo desta conta."}
        </small>
      </div>

      {signup && (
        <div className="field">
          <label htmlFor="fullName">Nome completo</label>
          <input id="fullName" name="fullName" autoComplete="name" required />
        </div>
      )}

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
          minLength={8}
          required
        />
      </div>

      {!signup && (
        <p className="muted" style={{ margin: "4px 0 16px", fontSize: 13 }}>
          A sessão será mantida neste dispositivo até sair da conta.
        </p>
      )}

      {state.error && (
        <p role="alert" className="notice" style={{ marginBottom: 16 }}>
          {state.error}
        </p>
      )}

      <button className="btn primary full" disabled={pending}>
        {pending ? "A processar..." : signup ? "Criar conta" : "Entrar"}
      </button>
    </form>
  );
}
