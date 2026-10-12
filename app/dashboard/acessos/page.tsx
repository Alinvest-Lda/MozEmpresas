export const dynamic = "force-dynamic";

import Link from "next/link";
import { InviteForm } from "@/components/access-invite-form";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateBusinessMemberRole, removeBusinessMember } from "@/lib/businesses/access-actions";
const roleLabels: Record<string, string> = {
  owner: "Proprietário", admin: "Administrador", operator: "Operador", member: "Membro", viewer: "Consulta",
};

const permissionGroups = [
  ["Proprietário", "Controlo total da empresa, equipa, publicações e actividade comercial."],
  ["Administrador", "Gestão da empresa, equipa, ofertas, compras, vendas e participações."],
  ["Operador", "Execução das operações diárias permitidas na empresa."],
  ["Membro", "Participação nas actividades autorizadas pela empresa."],
  ["Consulta", "Acesso de leitura à informação autorizada."],
];

export default async function AcessosPage({searchParams}:{searchParams?:Promise<{view?:string;status?:string;invite?:string}>}) {
  const params = await searchParams;
  const view = ["membros", "auditoria", "convites"].includes(params?.view || "") ? params?.view || "membros" : "membros";
  const feedback: Record<string, { kind: "success" | "warning" | "error"; message: string }> = {
    "role-updated": { kind: "success", message: "Função actualizada e alteração registada." },
    "role-updated-audit-warning": { kind: "warning", message: "A função foi actualizada, mas não foi possível registar a alteração na auditoria." },
    "access-revoked": { kind: "success", message: "Acesso revogado e evento registado." },
    "access-revoked-audit-warning": { kind: "warning", message: "O acesso foi revogado, mas não foi possível registar o evento na auditoria." },
    "role-error": { kind: "error", message: "Não foi possível actualizar a função. Verifique as permissões e tente novamente." },
    "access-error": { kind: "error", message: "Não foi possível revogar o acesso. Nenhuma confirmação foi emitida." },
    "permission-denied": { kind: "error", message: "Não tem permissões suficientes para executar esta acção." },
    "member-not-found": { kind: "error", message: "O membro já não existe ou não tem acesso a esta empresa." },
    "owner-protected": { kind: "warning", message: "A função do proprietário principal não pode ser alterada nem revogada por esta acção." },
    "self-change-protected": { kind: "warning", message: "Não pode alterar a sua própria função nem revogar o seu próprio acesso. Peça a outro administrador para o fazer." },
    "invalid-request": { kind: "error", message: "Os dados enviados são inválidos. Actualize a página e tente novamente." },
  };
  const inviteFeedback: Record<string, { kind: "success" | "warning" | "error"; message: string }> = {
    accepted: { kind: "success", message: "Convite aceite. A empresa já está associada à sua conta." },
    "accepted-audit-warning": { kind: "warning", message: "Convite aceite, mas não foi possível registar o evento na auditoria." },
    invalid: { kind: "error", message: "Este convite é inválido, expirou ou não corresponde ao email da conta autenticada." },
    error: { kind: "error", message: "Não foi possível concluir a aceitação do convite. Verifique o acesso antes de tentar novamente." },
  };
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ownedBusinesses } = await supabase.from("businesses").select("id,name,slug").eq("owner_id", user.id).is("archived_at", null).order("name");
  const { data: memberships } = await supabase.from("business_members").select("business_id,role").eq("user_id", user.id).neq("role","viewer");
  const memberIds = [...new Set((memberships ?? []).map(item => item.business_id))];
  const manageableMembershipIds = [...new Set((memberships ?? []).filter(item => item.role === "admin").map(item => item.business_id))];
  const { data: memberBusinesses } = memberIds.length ? await supabase.from("businesses").select("id,name,slug").in("id",memberIds).is("archived_at", null) : { data: [] };
  const businesses = [...(ownedBusinesses ?? []), ...(memberBusinesses ?? []).filter(item => !(ownedBusinesses ?? []).some(o => o.id === item.id))];
  const businessIds = [...new Set([...(ownedBusinesses ?? []).map((item) => item.id), ...manageableMembershipIds])];
  const manageableBusinesses = businesses.filter((business) => businessIds.includes(business.id));
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
        {params?.status && feedback[params.status] && <p role="status" className={feedback[params.status].kind === "success" ? "account-success" : feedback[params.status].kind === "warning" ? "notice" : "form-error"}>{feedback[params.status].message}</p>}
        {params?.invite && inviteFeedback[params.invite] && <p role="status" className={inviteFeedback[params.invite].kind === "success" ? "account-success" : inviteFeedback[params.invite].kind === "warning" ? "notice" : "form-error"}>{inviteFeedback[params.invite].message}</p>}
        {view==="membros" && <section className="dashboard-section access-invite-card">
          <div className="dashboard-section-head">
            <div><span className="dashboard-kicker">Adicionar pessoa</span><h2>Convidar para a equipa</h2><p>O convite fica associado à empresa e à função escolhida.</p></div>
          </div>
          {manageableBusinesses.length ? (
            <InviteForm businesses={manageableBusinesses} />
                    ) : (
            <div className="empty"><p>Crie primeiro uma empresa para poder convidar a equipa.</p><Link href="/dashboard/empresas" className="btn primary">Criar empresa</Link></div>
          )}
        </section>}

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
                    <td>{member.role === "owner" ? <span className="muted">Controlo principal</span> : !businessIds.includes(member.business_id) ? <span className="muted">Sem permissões de gestão</span> : <form action={updateBusinessMemberRole} className="access-role-form">
                      <input type="hidden" name="businessId" value={member.business_id} /><input type="hidden" name="userId" value={member.user_id} />
                      <select name="role" defaultValue={member.role}><option value="admin">Administrador</option><option value="operator">Operador</option><option value="member">Membro</option><option value="viewer">Consulta</option></select><button className="btn" type="submit">Guardar</button><button className="btn danger" type="submit" formAction={removeBusinessMember} name="revoke" value="1">Revogar</button>
                    </form>}</td>
                  </tr>;
                })}</tbody>
              </table>{!members?.length && <div className="empty"><p>Ainda não existem outros membros com acesso atribuído.</p></div>}</div>
            ) : (
              <div className="empty">
                <p>Ainda não tem uma empresa disponível para gerir acessos.</p>
                <Link href="/dashboard/empresas?view=criar" className="btn primary">Criar empresa →</Link>
              </div>
            )}
          </section>

          <aside className="dashboard-section">
            <div className="dashboard-section-head"><div><span className="dashboard-kicker">Hierarquia</span><h2>Funções</h2></div></div>
            <div className="access-role-list">{permissionGroups.map(([role, description]) => <div className="access-role-item" key={role}><strong>{role}</strong><p>{description}</p></div>)}</div>
            <div className="access-note"><strong>Princípio do sistema</strong><p>O acesso é definido por função e permissões. Não transforma o utilizador em “comprador” ou “prestador”. A mesma empresa pode comprar, vender, publicar, participar e gerir parceiros.</p></div>
          </aside>
        </div>}

        {view==="convites" && <section className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Convites</span><h2>Convites de acesso</h2><p>Controle convites pendentes e o seu prazo.</p></div></div>{(invitations??[]).length?(invitations??[]).map(i=><div className="credit-request-row" key={i.id}><div><strong>{i.email} · {roleLabels[i.role]||i.role}</strong><small>{businessMap.get(i.business_id)?.name||"Empresa"} · criado {new Date(i.created_at).toLocaleString("pt-MZ")} · expira {new Date(i.expires_at).toLocaleString("pt-MZ")}</small></div><span>{i.accepted_at ? "Aceite" : new Date(i.expires_at).getTime() <= Date.now() ? "Expirado" : "Pendente"}</span></div>):<p className="muted">Não existem convites registados.</p>}</section>}

        {view==="auditoria" && <section className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Segurança</span><h2>Auditoria de acessos</h2><p>Registo das alterações de função e eventos de acesso associados às empresas que administra.</p></div></div>{(auditLogs??[]).length?(auditLogs??[]).map(log=><div className="credit-request-row" key={log.id}><div><strong>{log.action}</strong><small>{businessMap.get(log.business_id)?.name||"Empresa"} · actor {profileMap.get(log.actor_user_id)?.full_name || (log.actor_user_id ? log.actor_user_id.slice(0,8) : "—")} · alvo {profileMap.get(log.target_user_id)?.full_name || (log.target_user_id ? log.target_user_id.slice(0,8) : "—")}</small></div><span>{log.role_from&&log.role_to?log.role_from+" → "+log.role_to:new Date(log.created_at).toLocaleString("pt-MZ")}</span></div>):<p className="muted">Ainda não existem eventos de auditoria.</p>}</section>}
      </div></main>
  );
}