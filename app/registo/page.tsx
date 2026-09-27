import Link from "next/link";
import { signUp } from "@/lib/auth/actions";
import { AuthForm } from "@/components/auth-form";

export default function Registo() {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand-panel">
          <Link href="/" className="auth-logo">Moz<span>Empresas</span></Link>
          <h1>Crie a sua presença no ecossistema empresarial de Moçambique.</h1>
          <p>Registe-se para apresentar a sua empresa, publicar ofertas e oportunidades e acompanhar as interações que acontecem no MozEmpresas.</p>
          <div className="auth-points"><span>01 <b>Registo simples</b></span><span>02 <b>Presença empresarial</b></span><span>03 <b>Mais formas de ser encontrado</b></span></div>
        </aside>
        <section className="auth-card">
          <span className="eyebrow">Começar</span>
          <h2>Criar conta</h2>
          <p className="muted">Crie a sua conta para começar a utilizar o MozEmpresas.</p>
          <AuthForm action={signUp} mode="signup" />
          <p className="auth-switch muted">Já tem conta? <Link href="/login">Entrar</Link></p>
        </section>
      </div>
    </main>
  );
}