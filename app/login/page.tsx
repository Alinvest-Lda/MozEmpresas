import Link from "next/link";
import { signIn } from "@/lib/auth/actions";
import { AuthForm } from "@/components/auth-form";

export default async function Login({ searchParams }: { searchParams: Promise<{ registered?: string; next?: string }> }) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand-panel">
          <Link href="/" className="auth-logo">Moz<span>Empresas</span></Link>
          <span className="eyebrow auth-eyebrow">Ecossistema empresarial</span>
          <h1>Entre para continuar a construir a sua presença no mercado.</h1>
          <p>Uma conta para gerir o seu perfil, empresa, publicações, anúncios e interações dentro do MozEmpresas.</p>
          <div className="auth-points"><span>01 <b>Perfil empresarial</b></span><span>02 <b>Oportunidades</b></span><span>03 <b>Produtos e serviços</b></span></div>
        </aside>
        <section className="auth-card">
          <span className="eyebrow">Acesso à plataforma</span>
          <h2>Entrar no MozEmpresas</h2>
          <p className="muted">Aceda à sua área empresarial e continue de onde ficou.</p>
          {params.registered === "1" && <p className="notice" style={{ marginTop: 18 }}>Conta criada. Se a confirmação de email estiver activa, confirme o email antes de entrar.</p>}
          <AuthForm action={signIn} mode="login" next={params.next} />
          <p className="auth-switch muted">Ainda não tem conta? <Link href="/registo">Criar conta</Link></p>
        </section>
      </div>
    </main>
  );
}