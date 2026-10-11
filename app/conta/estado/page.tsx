export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountStatusForm } from "@/components/account-forms";

export default async function AccountStatusRecoveryPage({ searchParams }: { searchParams?: Promise<{ inactive?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name,account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!error && profile?.account_status === "ACTIVE") redirect("/dashboard");

  const status = profile?.account_status;
  const canReactivate = !error && status === "INACTIVE";

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand-panel">
          <Link href="/" className="auth-logo">Moz<span>Empresas</span></Link>
          <h1>Estado da sua conta.</h1>
          <p>O acesso às áreas empresariais depende de uma conta activa. Esta página permite rever o estado sem abrir o restante painel.</p>
          <div className="auth-points">
            <span>01 <b>Consulte o estado</b></span>
            <span>02 <b>Reactive a conta, se aplicável</b></span>
            <span>03 <b>Volte ao painel após activar</b></span>
          </div>
        </aside>
        <section className="auth-card">
          <span className="eyebrow">Acesso à plataforma</span>
          <h2>{canReactivate ? "Conta desactivada" : "Acesso condicionado"}</h2>
          <p className="muted">{user.email}</p>
          {params?.inactive === "1" && canReactivate && <p className="notice" role="status">A sua conta está desactivada. Pode reactivá-la abaixo. As restantes áreas permanecem bloqueadas até a conta voltar a estar activa.</p>}
          {canReactivate ? (
            <>
              <div className="account-status-actions">
                <div><strong>Estado actual: Inactiva</strong><p>Seleccione “Activar” para recuperar o acesso normal. A alteração será aplicada à conta autenticada.</p></div>
                <AccountStatusForm status="INACTIVE" />
              </div>
              <p className="auth-switch muted"><Link href="/login">Voltar ao início de sessão</Link></p>
            </>
          ) : (
            <>
              <p className="notice" role="alert">{error || !profile ? "Não foi possível confirmar o estado da conta. Contacte o suporte antes de tentar novamente." : status === "DELETED" ? "Existe um pedido de eliminação associado à conta. A reactivação exige revisão da equipa de suporte." : "O estado da conta não permite o acesso normal. Contacte a equipa de suporte para revisão."}</p>
              <p className="auth-switch muted"><Link href="/login">Voltar ao início de sessão</Link></p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
