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
          <h1>Entre para continuar a descobrir, apresentar e criar oportunidades no mercado.</h1>
          <p>O MozEmpresas aproxima empresas, organizações, fornecedores e oportunidades. A sua conta dá acesso às funções adequadas ao papel que escolheu.</p>
          <div className="auth-points"><span>01 <b>Apresente a sua actividade</b></span><span>02 <b>Encontre fornecedores e soluções</b></span><span>03 <b>Participe em oportunidades</b></span></div>
        </aside>
        <section className="auth-card">
          <span className="eyebrow">Acesso à plataforma</span>
          <h2>Entrar no MozEmpresas</h2>
          <p className="muted">Seleccione o tipo de conta que representa a sua utilização do portal e entre com as suas credenciais. A sessão permanece activa neste dispositivo até sair da conta.</p>
          {params.registered === "1" && <p className="notice" style={{ marginTop: 18 }}>Conta criada. Se a confirmação de email estiver activa, confirme o email antes de entrar.</p>}
          <AuthForm action={signIn} mode="login" next={params.next} />
          <p className="auth-switch muted">Ainda não tem conta? <Link href="/registo">Criar conta</Link></p>
        </section>
      </div>
    </main>
  );
}