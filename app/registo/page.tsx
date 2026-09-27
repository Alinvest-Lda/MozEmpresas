import Link from "next/link";
import { signUp } from "@/lib/auth/actions";
import { AuthForm } from "@/components/auth-form";

export default function Registo() {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand-panel">
          <Link href="/" className="auth-logo">Moz<span>Empresas</span></Link>
          <h1>Entre no ecossistema empresarial de Moçambique.</h1>
          <p>Crie a sua conta e, a partir do painel, apresente a sua empresa, encontre fornecedores, publique ofertas, participe em concursos e responda a oportunidades.</p>
          <div className="auth-points">
            <span>01 <b>Crie a sua conta</b></span>
            <span>02 <b>Associe a sua empresa</b></span>
            <span>03 <b>Active as suas oportunidades</b></span>
          </div>
        </aside>
        <section className="auth-card">
          <span className="eyebrow">Começar</span>
          <h2>Criar conta</h2>
          <p className="muted">Não precisa de escolher entre comprador ou prestador. A mesma conta pode participar em diferentes actividades dentro do MozEmpresas.</p>
          <AuthForm action={signUp} mode="signup" />
          <p className="auth-switch muted">Já tem conta? <Link href="/login">Entrar</Link></p>
        </section>
      </div>
    </main>
  );
}
