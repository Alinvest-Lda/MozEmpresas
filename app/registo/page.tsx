import Link from "next/link";
import { signUp } from "@/lib/auth/actions";
import { AuthForm } from "@/components/auth-form";

export default function Registo() {
  return <div className="auth"><div className="auth-card"><span className="eyebrow">Começar</span><h1>Criar conta</h1><p className="muted">Uma conta para todas as suas capacidades no MozEmpresas.</p><AuthForm action={signUp} mode="signup" /><p className="muted" style={{ fontSize: 13, marginTop: 20 }}>Já tem conta? <Link href="/login" style={{ color: "var(--brand)", fontWeight: 800 }}>Entrar</Link></p></div></div>;
}