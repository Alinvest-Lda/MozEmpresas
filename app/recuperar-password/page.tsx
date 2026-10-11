import Link from "next/link";
import { PasswordRecoveryRequestForm } from "@/components/password-recovery-forms";

export default function RecuperarPassword() {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand-panel">
          <Link href="/" className="auth-logo">Moz<span>Empresas</span></Link>
          <h1>Recupere o acesso à sua conta.</h1>
          <p>Vamos enviar instruções para o email associado à sua conta, caso exista um registo com esse endereço.</p>
          <div className="auth-points">
            <span>01 <b>Indique o seu email</b></span>
            <span>02 <b>Abra o link recebido</b></span>
            <span>03 <b>Defina uma nova password</b></span>
          </div>
        </aside>
        <section className="auth-card">
          <span className="eyebrow">Recuperação de acesso</span>
          <h2>Esqueceu-se da password?</h2>
          <p className="muted">Introduza o email da conta. Por segurança, a mensagem de confirmação não revela se o endereço está registado.</p>
          <PasswordRecoveryRequestForm />
          <p className="auth-switch muted"><Link href="/login">Voltar ao início de sessão</Link></p>
        </section>
      </div>
    </main>
  );
}
