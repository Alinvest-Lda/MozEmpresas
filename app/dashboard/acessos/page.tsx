export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateBusinessMemberRole } from "@/lib/businesses/access-actions";\nimport { inviteBusinessMember } from "@/lib/businesses/invitation-actions";

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  operator: "Operador",
  member: "Membro",
  viewer: "Consulta",
};

const permissions: Record<string, string[]> = {
  owner: ["Tudo", "Equipa e acessos", "Empresa", "Publicações", "Marketplace"],
  admin: ["Empresa", "Publicações", "Marketplace", "Equipa"],
  operator: ["Publicações", "Marketplace", "Oportunidades"],
  member: ["Participação", "Marketplace", "Oportunidades"],
  viewer: ["Consulta", "Dados públicos"],
};

export default async function AcessosPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: businesses } = await supabase.from("businesses").select("id,name,slug").eq("owner_id", user.id).order("name");
  const businessIds = (businesses ?? []).map((item) => item.id);
  const { data: members } = businessIds.length
    ? await supabase.from("business_members").select("business_id,user_id,role,created_at").in("business_id", businessIds)
    : { data: [] };
  const memberUserIds = [...new Set((members ?? []).map((member) => member.user_id))];
  const { data: profiles } = memberUserIds.length
    ? await supabase.from("profiles").select("id,full_name,avatar_url").in("id", memberUserIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const businessMap = new Map((businesses ?? []).map((business) => [business.id, business]));

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand"><small>Área empresarial</small><strong>MozEmpresas</strong></div>
        <div className="dashboard-nav-group"><span>Principal</span>
          <Link className="dashboard-nav-link" href="/dashboard"><i className="nav-dot" />Visão geral</Link>
          <Link className="dashboard-nav-link" href="/marketplace"><i className="nav-dot" />Comprar e vender</Link>
          <Link className="dashboard-nav-link" href="/concursos"><i className="nav-dot" />Concursos</Link>
          <Link className="dashboard-nav-link" href="/oportunidades"><i className="nav-dot" />Oportunidades</Link>
        </div>
        <div className="dashboard-nav-group"><span>Empresa</span>
          <Link className="dashboard-nav-link" href="/dashboard/empresas"><i className="nav-dot" />Presença da empresa</Link>
          <Link className="dashboard-nav-link active" href="/dashboard/acessos"><i className="nav-dot" />Acessos e equipa</Link>
          <Link className="dashboard-nav-link" href="/empresas"><i className="nav-dot" />Directório</Link>
        </div>
        <div className="dashboard-nav-group"><span>Ecossistema</span>
          
          <Link className="dashboard-nav-link" href="/marketplace"><i className="nav-dot" />Recomendações</Link>
        </div>
      </aside>

      <main className="dashboard-main"><div className="dashboard-content">
        <div className="dashboard-topbar">
          <div><span className="dashboard-kicker">Controlo de acesso</span><h1>Acessos e equipa</h1><p>Defina quem pode trabalhar em nome de cada empresa e mantenha as permissões proporcionais à função.</p></div>
          <Link href="/dashboard" className="btn">Voltar ao painel</Link>
        </div>

        <div className="access-layout">\n          <section className="dashboard-section" style={{gridColumn:"1/-1"}}>\n            <div className="dashboard-section-head"><div><span className="dashboard-kicker">Novo acesso</span><h2>Convidar membro</h2><p>Envie um convite para alguém trabalhar em nome de uma empresa.</p></div></div>\n            {businesses?.length ? <form action={inviteBusinessMember} className="toolbar" style={{margin:0}}>\n              <select name="businessId" required aria-label="Empresa">{businesses.map((b)=><option value={b.id} key={b.id}>{b.name}</option>)}</select>\n              <input name="email" type="email" placeholder="email@empresa.co.mz" required aria-label="Email" />\n              <select name="role" defaultValue="operator" aria-label="Função"><option value="admin">Administrador</option><option value="operator">Operador</option><option value="member">Membro</option><option value="viewer">Consulta</option></select>\n              <button className="btn primary">Criar convite</button>\n            </form> : null}\n          </section>
          <section className="dashboard-section">
            <div className="dashboard-section-head"><div><span className="dashboard-kicker">Membros actuais</span><h2>Quem tem acesso</h2><p>O proprietário mantém o controlo da empresa. Os restantes acessos podem evoluir por função.</p></div></div>
            {businesses?.length ? (
              <div className="access-table-wrap">
                <table className="access-table">
                  <thead><tr><th>Pessoa</th><th>Empresa</th><th>Função</th><th>Alterar acesso</th></tr></thead>
                  <tbody>
                    {(members ?? []).map((member) => {
                      const profile = profileMap.get(member.user_id);
                      const business = businessMap.get(member.business_id);
                      const displayName = profile?.full_name || "Utilizador";
                      const editable = member.role !== "owner";
                      return (
                        <tr key={member.business_id + member.user_id}>
                          <td><div className="access-person"><span className="access-avatar">{displayName.slice(0,1).toUpperCase()}</span><div><strong>{displayName}</strong><small className="muted" style={{display:"block",fontSize:9}}>Membro da empresa</small></div></div></td>
                          <td>{business?.name || "—"}</td>
                          <td><span className={"access-role " + (member.role === "owner" ? "owner" : "")}>{roleLabels[member.role] || member.role}</span></td>
                          <td>{editable ? (
                            <form action={updateBusinessMemberRole}>
                              <input type="hidden" name="businessId" value={member.business_id} />
                              <input type="hidden" name="userId" value={member.user_id} />
                              <select name="role" defaultValue={member.role} aria-label={"Função de " + displayName} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
                                <option value="admin">Administrador</option><option value="operator">Operador</option><option value="member">Membro</option><option value="viewer">Consulta</option>
                              </select>
                            </form>
                          ) : <span className="muted">Controlo principal</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!members?.length && <div className="empty"><p>A empresa ainda não tem outros membros com acesso atribuído.</p></div>}
              </div>
            ) : <div className="empty"><div className="empty-icon">01</div><p>Crie primeiro uma empresa. Depois poderá organizar os acessos da equipa a partir deste módulo.</p><Link href="/dashboard/empresas" className="btn primary">Criar empresa</Link></div>}
          </section>

          <aside className="dashboard-section">
            <div className="dashboard-section-head"><div><span className="dashboard-kicker">Modelo de acesso</span><h2>Funções</h2></div></div>
            {Object.entries(permissions).map(([role, items]) => <div className="access-permission" key={role}><span>{roleLabels[role]}</span><strong>{items.join(" · ")}</strong></div>)}
            <p className="muted" style={{fontSize:10,lineHeight:1.5,marginTop:15}}>À medida que os módulos forem fechados, as permissões serão refinadas por actividade — compras, vendas, concursos, oportunidades, parceiros e administração.</p>
          </aside>
        </div>
      </div></main>
    </div>
  );
}
