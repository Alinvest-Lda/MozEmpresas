import Link from "next/link";
import { signIn } from "@/lib/auth/actions";
import { AuthForm } from "@/components/auth-form";

export default async function Login({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  const params = await searchParams;
  return <div className="auth"><div className="auth-card"><span className="eyebrow">Acesso</span><h1>Entrar no MozEmpresas</h1><p className="muted">Use a sua conta para gerir perfil, empresa, anúncios e candidaturas.</p>{params.registered === "1" && <p className="notice" style={{ marginTop: 18 }}>Conta criada. Se a confirmação de email estiver ativa, confirme o email antes de entrar.</p>}<AuthForm action={signIn} mode="login" /><p className="muted" style={{ fontSize: 13, marginTop: 20 }}>Ainda não tem conta? <Link href="/registo" style={{ color: "var(--brand)", fontWeight: 800 }}>Criar conta</Link></p></div></div>;
}