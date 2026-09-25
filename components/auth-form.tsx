"use client";
import { useActionState } from "react";
import type { AuthState } from "@/lib/auth/actions";
type Props = { action: (state: AuthState, formData: FormData) => Promise<AuthState>; mode: "login" | "signup" };
export function AuthForm({ action, mode }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const signup = mode === "signup";
  return <form action={formAction} style={{ marginTop: 24 }}>{signup && <div className="field"><label htmlFor="fullName">Nome completo</label><input id="fullName" name="fullName" autoComplete="name" required /></div>}<div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div><div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={8} required /></div>{state.error && <p role="alert" className="notice" style={{ marginBottom: 16 }}>{state.error}</p>}<button className="btn primary full" disabled={pending}>{pending ? "A processar..." : signup ? "Criar conta" : "Entrar"}</button></form>;
}
