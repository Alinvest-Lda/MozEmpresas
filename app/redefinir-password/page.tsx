import Link from "next/link";
import { SetRecoveredPasswordForm } from "@/components/password-recovery-forms";

export default function RedefinirPassword() {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand-panel">
          <Link href="/" className="auth-logo">Moz<span>Empresas</span></Link>
          <h1>Defina uma nova password.</h1>
          <p>Use uma password com pelo menos 8 caracteres e que não utilize noutros serviços.</p>
          <div className="auth-points">
            <span>01 <b>Use o link de recuperação</b></span>
            <span>02 <b>Defina e confirme a password</b></span>
            <span>03 <b>Entre novamente na plataforma</b></span>
          </div>
        </aside>
        <section className="auth-card">
          <span className="eyebrow">Segurança da conta</span>
          <h2>Nova password</h2>
          <p className="muted">Esta página deve ser aberta a partir do link de recuperação enviado para o seu email.</p>
          <SetRecoveredPasswordForm />
          <p className="auth-switch muted"><Link href="/recuperar-password">Solicitar novo link</Link></p>
        </section>
      </div>
    </main>
  );
}
