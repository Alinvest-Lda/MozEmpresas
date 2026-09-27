import Link from "next/link";
import { signIn } from "@/lib/auth/actions";
import { AuthForm } from "@/components/auth-form";

export default async function Login({ searchParams }: { searchParams: Promise<{ registered?: string; confirmed?: string; next?: string }> }) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand-panel">
          <Link href="/" className="auth-logo">Moz<span>Empresas</span></Link>
          <h1>Uma conta para participar em todo o ecossistema.</h1>
          <p>Entre para gerir a sua presença empresarial, comprar, vender, participar em concursos, responder a oportunidades e criar novas relações de negócio.</p>
          <div className="auth-points">
            <span>01 <b>Gira a sua empresa</b></span>
            <span>02 <b>Compre e venda no ecossistema</b></span>
            <span>03 <b>Encontre oportunidades e parceiros</b></span>
          </div>
        </aside>
        <section className="auth-card">
          <span className="eyebrow">Acesso à plataforma</span>
          <h2>Entrar no MozEmpresas</h2>
          <p className="muted">Use apenas as suas credenciais. As capacidades disponíveis serão determinadas pela sua empresa e pelas permissões atribuídas.</p>
          {params.registered === "1" && <p className="notice" style={{ marginTop: 18 }}>Conta criada. Se a confirmação de email estiver activa, confirme o email antes de entrar.</p>}
          {params.confirmed === "1" && <p className="notice" style={{ marginTop: 18 }}>Email confirmado. Já pode entrar na sua conta.</p>}
          {params.confirmed === "error" && <p className="notice" style={{ marginTop: 18 }}>Não foi possível confirmar o email. Solicite um novo link de confirmação ou contacte o suporte.</p>}
          <AuthForm action={signIn} mode="login" next={params.next} />
          <p className="auth-switch muted">Ainda não tem conta? <Link href="/registo">Criar conta</Link></p>
        </section>
      </div>
    </main>
  );
}
