export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PartnerAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: context }, { data: members }] = await Promise.all([
    supabase.rpc("partner_account_context"),
    supabase.rpc("partner_account_members_list"),
  ]);

  const account = Array.isArray(context) ? context[0] : null;
  const profile = await supabase
    .from("profiles")
    .select("full_name,account_status,user_type")
    .eq("id", user.id)
    .maybeSingle()
    .then((x) => x.data);

  const name = account?.account_name || profile?.full_name || user.email?.split("@")[0] || "Parceiro";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();

  return (
    <main className="dashboard-main">
      <div className="dashboard-content account-page">
        <header className="account-hero">
          <div className="account-hero-main">
            <span className="account-section-label">Conta de parceiro</span>
            <h1>{name}</h1>
            <p>Uma entidade, uma relação com a MozEmpresas e os gestores autorizados a actuar nesta conta.</p>
          </div>
          <aside className="account-identity-card">
            <div className="account-avatar">{initials || "P"}</div>
            <strong>{name}</strong>
            <span>{user.email}</span>
            <span className={"account-status-badge " + (account?.account_status || profile?.account_status || "ACTIVE").toLowerCase()}>
              {account?.account_status || profile?.account_status || "ACTIVE"}
            </span>
          </aside>
        </header>

        <nav className="commerce-nav" aria-label="Gestão da conta">
          <a className="active" href="#perfil">Perfil e acesso</a>
          <a href="#gestores">Gestores</a>
        </nav>

        <section id="perfil" className="account-panel">
          <div className="account-panel-head">
            <div>
              <span className="account-section-label">Entidade</span>
              <h2>Identidade da conta</h2>
              <p>A conta representa uma única entidade parceira dentro do ecossistema MozEmpresas.</p>
            </div>
          </div>
          <div className="account-email">
            <span>Email de acesso actual</span>
            <strong>{user.email}</strong>
            <small>O acesso dedicado foi atribuído pela administração da plataforma.</small>
          </div>
        </section>

        <section id="gestores" className="account-panel" style={{ marginTop: 18 }}>
          <div className="account-panel-head">
            <div>
              <span className="account-section-label">Equipa da conta</span>
              <h2>Gestores autorizados</h2>
              <p>Todos os gestores actuam sobre a mesma entidade parceira. Não são criadas empresas adicionais.</p>
            </div>
          </div>
          <div className="account-email">
            {(members ?? []).map((member: { member_id: string; full_name: string; email: string | null; member_role: string; active: boolean }) => (
              <div key={member.member_id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <strong>{member.full_name || member.email || "Gestor"}</strong>
                  <small>{member.email || "Email não disponível"}</small>
                </div>
                <span>{member.member_role === "owner" ? "Administrador" : member.member_role === "manager" ? "Gestor" : member.member_role === "analyst" ? "Analista" : "Visualizador"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}