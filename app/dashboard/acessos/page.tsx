export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateBusinessMemberRole, removeBusinessMember } from "@/lib/businesses/access-actions";
import { inviteBusinessMember } from "@/lib/businesses/invitation-actions";
const roleLabels: Record<string, string> = {
  owner: "Proprietário", admin: "Administrador", operator: "Operador", member: "Membro", viewer: "Consulta",
};

const permissionGroups = [
  ["Proprietário", "Controlo total da empresa, equipa, publicações e actividade comercial."],
  ["Administrador", "Gestão da empresa, equipa, ofertas, compras, vendas e participações."],
  ["Operador", "Operação diária de ofertas, compras, vendas, oportunidades e concursos."],
  ["Membro", "Participação em compras, oportunidades e concursos."],
  ["Consulta", "Acesso de leitura à informação autorizada."],
];

export default async function AcessosPage({searchParams}:{searchParams?:Promise<{view?:string}>}) {
  const params=await searchParams; const view=["membros","auditoria","convites"].includes(params?.view||"")?params?.view||"membros":"membros";
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ownedBusinesses } = await supabase.from("businesses").select("id,name,slug").eq("owner_id", user.id).order("name");
  const { data: memberships } = await supabase.from("business_members").select("business_id,role").eq("user_id", user.id).neq("role","viewer");
  const memberIds = [...new Set((memberships ?? []).map(item => item.business_id))];
  const { data: memberBusinesses } = memberIds.length ? await supabase.from("businesses").select("id,name,slug").in("id",memberIds) : { data: [] };
  const businesses = [...(ownedBusinesses ?? []), ...(memberBusinesses ?? []).filter(item => !(ownedBusinesses ?? []).some(o => o.id === item.id))];
  const businessIds = (ownedBusinesses ?? []).map((item) => item.id);
  const { data: members } = businessIds.length
    ? await supabase.from("business_members").select("business_id,user_id,role,created_at").in("business_id", businessIds).order("created_at")
    : { data: [] };

  const memberUserIds = [...new Set((members ?? []).map((member) => member.user_id))];
  const { data: profiles } = memberUserIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", memberUserIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const {data:auditLogs}=businessIds.length?await supabase.from("access_audit_log").select("id,business_id,actor_user_id,target_user_id,action,role_from,role_to,created_at").in("business_id",businessIds).order("created_at",{ascending:false}).limit(50):{data:[]};
  const {data:invitations}=businessIds.length?await supabase.from("business_invitations").select("id,business_id,email,role,invited_by,expires_at,accepted_at,created_at").in("business_id",businessIds).order("created_at",{ascending:false}).limit(50):{data:[]};
  const businessMap = new Map((businesses ?? []).map((business) => [business.id, business]));

  return (
    <main className="dashboard-main"><div className="dashboard-content">
        <div className="dashboard-topbar">
          <div><span className="dashboard-kicker">Governação</span><h1>Acessos e equipa</h1><p>Organize quem pode agir em nome de cada empresa. As funções controlam o que cada pessoa pode ver e executar.</p></div>
          <Link href="/dashboard" className="btn">Voltar ao painel</Link>
        </div>

        <nav className="commerce-nav" aria-label="Gestão de acessos"><Link href="/dashboard/acessos" className={view==="membros"?"active":""}>Membros</Link><Link href="/dashboard/acessos?view=convites" className={view==="convites"?"active":""}>Convites</Link><Link href="/dashboard/acessos?view=auditoria" className={view==="auditoria"?"active":""}>Auditoria</Link></nav>
        {view==="membros" && <section className="dashboard-section access-invite-card">
          <div className="dashboard-section-head">
            <div><span className="dashboard-kicker">Adicionar pessoa</span><h2>Convidar para a equipa</h2><p>O convite fica associado à empresa e à função escolhida.</p></div>
          </div>
          {businesses?.length ? (
            <form action={async (formData) => { await inviteBusinessMember(formData); }} className="access-invite-form">
              <label><span>Empresa</span><select name="businessId" required>{businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label>
              <label><span>Email</span><input name="email" type="email" placeholder="email@empresa.co.mz" required /></label>
              <label><span>Função</span><select name="role" defaultValue="operator"><option value="admin">Administrador</option><option value="operator">Operador</option><option value="member">Membro</option><option value="viewer">Consulta</option></select></label>
              <button className="btn primary" type="submit">Criar convite</button>
            </form>
          ) : (
            <div className="empty"><p>Crie primeiro uma empresa para poder convidar a equipa.</p><Link href="/dashboard/empresas" className="btn primary">Criar empresa</Link></div>
          )}
        </section>

        {view==="membros" && <div className="access-layout">
          <section className="dashboard-section">
            <div className="dashboard-section-head"><div><span className="dashboard-kicker">Membros</span><h2>Quem tem acesso</h2><p>Os membros aparecem associados à empresa onde receberam acesso.</p></div></div>
            {businesses?.length ? (
              <div className="access-table-wrap"><table className="access-table">
                <thead><tr><th>Pessoa</th><th>Empresa</th><th>Função</th><th>Alterar</th></tr></thead>
                <tbody>{(members ?? []).map((member) => {
                  const profile = profileMap.get(member.user_id);
                  const business = businessMap.get(member.business_id);
                  const displayName = profile?.full_name || "Utilizador";
                  return <tr key={member.business_id + member.user_id}>
                    <td><div className="access-person"><span className="access-avatar">{displayName.slice(0,1).toUpperCase()}</span><div><strong>{displayName}</strong><small>Conta associada</small></div></div></td>
                    <td>{business?.name || "—"}</td>
                    <td><span className={"access-role " + (member.role === "owner" ? "owner" : "")}>{roleLabels[member.role] || member.role}</span></td>
                    <td>{member.role === "owner" ? <span className="muted">Controlo principal</span> : <form action={updateBusinessMemberRole} className="access-role-form">
                      <input type="hidden" name="businessId" value={member.business_id} /><input type="hidden" name="userId" value={member.user_id} />
                      <select name="role" defaultValue={member.role}><option value="admin">Administrador</option><option value="operator">Operador</option><option value="member">Membro</option><option value="viewer">Consulta</option></select><button className="btn" type="submit">Guardar</button><button className="btn danger" type="submit" formAction={removeBusinessMember} name="revoke" value="1">Revogar</button>
                    </form>}</td>
                  </tr>;
                })}</tbody>
              </table>{!members?.length && <div className="empty"><p>Ainda não existem outros membros com acesso atribuído.</p></div>}</div>
            ) : null}
          </section>

          <aside className="dashboard-section">
            <div className="dashboard-section-head"><div><span className="dashboard-kicker">Hierarquia</span><h2>Funções</h2></div></div>
            <div className="access-role-list">{permissionGroups.map(([role, description]) => <div className="access-role-item" key={role}><strong>{role}</strong><p>{description}</p></div>)}</div>
            <div className="access-note"><strong>Princípio do sistema</strong><p>O acesso é definido por função e permissões. Não transforma o utilizador em “comprador” ou “prestador”. A mesma empresa pode comprar, vender, publicar, participar e gerir parceiros.</p></div>
          </aside>
        </div>
        </div>}

        {view==="convites" && <section className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Convites</span><h2>Convites de acesso</h2><p>Controle convites pendentes e o seu prazo.</p></div></div>{(invitations??[]).length?(invitations??[]).map(i=><div className="credit-request-row" key={i.id}><div><strong>{i.email} · {roleLabels[i.role]||i.role}</strong><small>{businessMap.get(i.business_id)?.name||"Empresa"} · criado {new Date(i.created_at).toLocaleString("pt-MZ")} · expira {new Date(i.expires_at).toLocaleString("pt-MZ")}</small></div><span>{i.accepted_at?"Aceite":"Pendente"}</span></div>):<p className="muted">Não existem convites registados.</p>}</section>}

        {view==="auditoria" && <section className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Segurança</span><h2>Auditoria de acessos</h2><p>Registo das alterações de função e eventos de acesso associados às empresas que administra.</p></div></div>{(auditLogs??[]).length?(auditLogs??[]).map(log=><div className="credit-request-row" key={log.id}><div><strong>{log.action}</strong><small>{businessMap.get(log.business_id)?.name||"Empresa"} · actor {profileMap.get(log.actor_user_id)?.full_name||log.actor_user_id.slice(0,8)} · alvo {profileMap.get(log.target_user_id)?.full_name||log.target_user_id.slice(0,8)}</small></div><span>{log.role_from&&log.role_to?log.role_from+" → "+log.role_to:new Date(log.created_at).toLocaleString("pt-MZ")}</span></div>):<p className="muted">Ainda não existem eventos de auditoria.</p>}</section>}
      </div></main>
  );
}