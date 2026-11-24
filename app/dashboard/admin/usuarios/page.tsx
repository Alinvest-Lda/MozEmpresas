export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { createAdminClient } from "@/lib/security/rate-limit";
import { setManagedAccountStatus, sendManagedPasswordRecovery } from "@/lib/admin/account-management-actions";

const statusLabels: Record<string,string> = { ACTIVE: "Activa", INACTIVE: "Suspensa", DELETED: "Eliminação solicitada" };
const resultMessages: Record<string,string> = {
  updated: "Estado da conta actualizado. O acesso de autenticação foi actualizado e a operação ficou registada.",
  "recovery-sent": "Instruções de recuperação enviadas para o email da conta e evento registado.",
  "recovery-audit-warning": "O pedido de recuperação foi enviado, mas o registo de auditoria falhou. Verifique o histórico.",
  invalid: "Dados inválidos. Indique uma justificação com pelo menos 8 caracteres.",
  self: "Não pode suspender, reactivar ou encerrar a sua própria conta administrativa.",
  "last-admin": "A operação foi bloqueada para proteger o último Super Admin activo.",
  forbidden: "Não tem autorização para esta operação.",
  "not-found": "A conta indicada não foi encontrada.",
  unchanged: "A conta já se encontra nesse estado.",
  "service-unavailable": "O serviço administrativo de autenticação não está configurado. Nenhuma alteração foi feita.",
  "auth-update-failed": "Não foi possível actualizar o estado de autenticação. Nenhuma alteração de perfil foi confirmada.",
  "update-failed": "A alteração falhou. O estado de autenticação anterior foi restaurado quando possível.",
  "recovery-failed": "Não foi possível iniciar a recuperação de password.",
};

export default async function AdminUsersPage({searchParams}:{searchParams:Promise<{result?:string}>}) {
  const params = await searchParams;
  const { supabase, authorized, user } = await getSuperAdminContext();
  if (!authorized || !user) redirect("/login?next=/dashboard/admin/usuarios");
  const admin = createAdminClient();
  if (!admin) return <main className="dashboard-main"><div className="dashboard-content"><h1>Utilizadores e acessos</h1><p role="alert" className="notice">O acesso administrativo à autenticação não está configurado. A listagem e as alterações foram bloqueadas por segurança.</p></div></main>;

  const users: Array<{id:string;email:string;created_at:string;last_sign_in_at:string|null}> = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return <main className="dashboard-main"><div className="dashboard-content"><h1>Utilizadores e acessos</h1><p role="alert" className="notice">Não foi possível consultar o serviço de autenticação. Nenhuma lista parcial será apresentada.</p></div></main>;
    users.push(...data.users.map(u=>({id:u.id,email:u.email||"Sem email",created_at:u.created_at,last_sign_in_at:u.last_sign_in_at||null})));
    if (data.users.length < 1000) break;
  }

  const [{data:profiles,error:profilesError},{data:platformMembers},{data:businessMembers},{data:partnerMembers},{data:audit,error:auditError}] = await Promise.all([
    admin.from("profiles").select("id,full_name,user_type,account_status,created_at,deactivated_at,deletion_requested_at"),
    admin.from("platform_members").select("user_id,role,active"),
    admin.from("business_members").select("user_id,role"),
    admin.from("partner_account_members").select("user_id,role,active"),
    supabase.from("platform_account_audit_log").select("id,actor_user_id,target_user_id,action,previous_status,new_status,reason,created_at").order("created_at",{ascending:false}).limit(100),
  ]);
  if (profilesError) return <main className="dashboard-main"><div className="dashboard-content"><h1>Utilizadores e acessos</h1><p role="alert" className="notice">Não foi possível consultar os perfis. Não serão apresentados dados incompletos.</p></div></main>;
  const profileMap = new Map((profiles||[]).map(p=>[p.id,p]));
  const platformMap = new Map((platformMembers||[]).map(m=>[m.user_id,m]));
  const emailById = new Map(users.map(u=>[u.id,u.email]));
  const nameById = new Map((profiles||[]).map(p=>[p.id,p.full_name]));
  const rows = users.map(u=>({ ...u, profile:profileMap.get(u.id), platform:platformMap.get(u.id),
    businessCount:(businessMembers||[]).filter(m=>m.user_id===u.id).length,
    partnerCount:(partnerMembers||[]).filter(m=>m.user_id===u.id && m.active).length,
  }));
  const result = params?.result && resultMessages[params.result] ? params.result : "";
  return <main className="dashboard-main"><div className="dashboard-content">
    <header className="dashboard-topbar"><div><span className="dashboard-kicker">Administração global · Pessoas</span><h1>Utilizadores e acessos</h1><p>Gerir contas, recuperar acessos e acompanhar decisões administrativas com histórico verificável.</p></div></header>
    {result && <p role="status" className="notice">{resultMessages[result]}</p>}
    <section className="admin-control-stats">
      <article className="admin-control-stat"><span className="admin-control-stat-label">Contas de autenticação</span><strong>{users.length}</strong><span>Utilizadores registados</span></article>
      <article className="admin-control-stat"><span className="admin-control-stat-label">Activas</span><strong>{rows.filter(r=>(r.profile?.account_status||"ACTIVE")==="ACTIVE").length}</strong><span>Com acesso normal</span></article>
      <article className="admin-control-stat"><span className="admin-control-stat-label">Suspensas / encerramento</span><strong>{rows.filter(r=>["INACTIVE","DELETED"].includes(r.profile?.account_status||"")).length}</strong><span>Exigem revisão ou recuperação</span></article>
      <article className="admin-control-stat"><span className="admin-control-stat-label">Eventos de auditoria</span><strong>{auditError?"—":audit?.length||0}</strong><span>Últimos 100 eventos</span></article>
    </section>
    <section className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Contas registadas</span><h2>Estado e operações</h2><p>Suspender bloqueia a autenticação; reactivar repõe o acesso. Encerrar regista um pedido de eliminação e bloqueia a conta, sem apagar imediatamente dados sujeitos a retenção legal ou financeira.</p></div></div>
      <div className="access-table-wrap"><table className="access-table"><thead><tr><th>Utilizador</th><th>Perfil / papel</th><th>Associações</th><th>Estado</th><th>Operações</th></tr></thead><tbody>
      {rows.map(row=>{const status=row.profile?.account_status||"ACTIVE";return <tr key={row.id}>
        <td><strong>{row.profile?.full_name||"Utilizador"}</strong><small>{row.email}</small><small>Criada {new Date(row.created_at).toLocaleDateString("pt-MZ")} · último acesso {row.last_sign_in_at?new Date(row.last_sign_in_at).toLocaleDateString("pt-MZ"):"nunca"}</small></td>
        <td>{row.profile?.user_type||"—"}{row.platform?.active?<small>Super Admin · {row.platform.role}</small>:null}</td>
        <td>{row.businessCount} empresa(s)<small>{row.partnerCount} parceria(s)</small></td>
        <td><strong>{statusLabels[status]||status}</strong></td>
        <td><div className="admin-request-list">
          {row.id!==user.id && <form action={setManagedAccountStatus} className="admin-request-form"><input type="hidden" name="userId" value={row.id}/><select name="status" defaultValue={status}><option value="ACTIVE">Reactivar</option><option value="INACTIVE">Suspender</option><option value="DELETED">Encerrar / pedido de eliminação</option></select><input name="reason" minLength={8} maxLength={500} required placeholder="Justificação (mín. 8 caracteres)"/><button className="btn primary" type="submit">Aplicar</button></form>}
          <form action={sendManagedPasswordRecovery}><input type="hidden" name="userId" value={row.id}/><input type="hidden" name="email" value={row.email}/><button className="btn" type="submit">Enviar recuperação</button></form>
        </div></td>
      </tr>})}
      </tbody></table></div>
    </section>
    <section className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Rastreabilidade</span><h2>Histórico de acessos e contas</h2><p>Eventos administrativos recentes, com responsável, conta afectada, decisão e justificação.</p></div></div>
      {auditError?<p role="alert" className="notice">Histórico temporariamente indisponível. Não será apresentado como vazio.</p>:audit?.length?<div className="admin-request-list">{audit.map(event=><article className="admin-request-card" key={event.id}><div className="admin-request-head"><div><strong>{event.action}</strong><small>{emailById.get(event.target_user_id||"")||event.target_user_id||"Conta não identificada"} · por {emailById.get(event.actor_user_id||"")||event.actor_user_id||"Sistema"}</small></div><span className="tag">{event.previous_status||"—"} → {event.new_status||"—"}</span></div><p>{event.reason||"Sem justificação adicional."}</p><small>{new Date(event.created_at).toLocaleString("pt-MZ")}</small></article>)}</div>:<p className="muted">Ainda não existem eventos de gestão de contas.</p>}
    </section>
  </div></main>;
}
