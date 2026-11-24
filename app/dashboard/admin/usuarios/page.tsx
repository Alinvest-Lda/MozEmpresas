export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Input, Select } from "@/components/ui";
import styles from "./usuarios.module.css";
import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { setManagedAccountStatus, sendManagedPasswordRecovery } from "@/lib/admin/account-management-actions";

type SearchParams = Promise<{ q?: string; tipo?: string; estado?: string; acesso?: string; associacao?: string; page?: string; result?: string }>;
const userTypes: Record<string,string> = { empresa:"Empresa", parceiro:"Parceiro", profissional:"Profissional" };
const accountStatuses: Record<string,string> = { ACTIVE:"Activa", INACTIVE:"Suspensa", DELETED:"Eliminação solicitada" };
const resultMessages: Record<string,string> = {
  updated:"Estado da conta actualizado, sessões de autenticação revogadas e decisão registada.",
  "recovery-sent":"Instruções de recuperação enviadas para o email da conta e evento registado.",
  "recovery-audit-warning":"O pedido de recuperação foi enviado, mas o registo de auditoria falhou.",
  invalid:"Dados inválidos. Indique uma justificação com pelo menos 8 caracteres.",
  self:"Não pode suspender, reactivar ou encerrar a sua própria conta administrativa.",
  "last-admin":"A operação foi bloqueada para proteger o último Super Admin activo.",
  forbidden:"Não tem autorização para esta operação.",
  "not-found":"A conta indicada não foi encontrada.",
  unchanged:"A conta já se encontra nesse estado.",
  "update-failed":"Não foi possível actualizar a conta. Verifique o estado e tente novamente.",
  "recovery-failed":"Não foi possível iniciar a recuperação de password."
};

export default async function AdminUsersPage({searchParams}:{searchParams?:SearchParams}) {
  const params=await searchParams;
  const q=(params?.q??"").trim().slice(0,120);
  const type=["empresa","parceiro","profissional"].includes(params?.tipo??"")?params?.tipo??"": "";
  const status=["ACTIVE","INACTIVE","DELETED"].includes(params?.estado??"")?params?.estado??"": "";
  const access=["admin_activo","admin_inactivo","sem_admin"].includes(params?.acesso??"")?params?.acesso??"": "";
  const association=["com_empresa","sem_empresa"].includes(params?.associacao??"")?params?.associacao??"": "";
  const requestedPage=Math.max(1,Math.min(10000,Number.parseInt(params?.page??"1",10)||1));
  const pageSize=30;
  const {supabase,authorized,user}=await getSuperAdminContext();
  if(!authorized||!user) redirect("/login?next=/dashboard/admin/usuarios");

  const {data:rows,error}=await supabase.rpc("admin_list_platform_users",{
    p_search:q||null,p_user_type:type||null,p_status:status||null,p_access:access||null,
    p_association:association||null,p_limit:pageSize,p_offset:(requestedPage-1)*pageSize
  });
  const users=rows??[];
  const total=Number(users[0]?.total_count??0);
  const pageCount=Math.max(1,Math.ceil(total/pageSize));
  const currentPage=Math.min(requestedPage,pageCount);
  const filterParams=new URLSearchParams();
  if(q)filterParams.set("q",q);if(type)filterParams.set("tipo",type);if(status)filterParams.set("estado",status);
  if(access)filterParams.set("acesso",access);if(association)filterParams.set("associacao",association);
  const queryString=filterParams.toString();
  const pageHref=(n:number)=>"/dashboard/admin/usuarios?"+[queryString,"page="+n].filter(Boolean).join("&");
  const {data:audit,error:auditError}=await supabase.rpc("admin_list_account_audit",{p_limit:50});
  const result=params?.result&&resultMessages[params.result]?params.result:"";
  const activeCount=users.filter((p:any)=>p.account_status==="ACTIVE").length;
  const deletionRequests=users.filter((p:any)=>p.account_status==="DELETED").length;

  return <main className={`dashboard-main admin-workspace ${styles.page}`}><div className={`dashboard-content ${styles.content}`}>
    <header className={styles.header}><div><span className={styles.eyebrow}>Administração global</span><h1>Utilizadores e acessos</h1><p>Pesquise perfis, faça gestão controlada do acesso e acompanhe as decisões administrativas com histórico verificável.</p></div><div className={styles.resultCount}><strong>{error?"—":total.toLocaleString("pt-MZ")}</strong><span>perfis encontrados</span></div></header>
    {result?<p className="notice" role="status">{resultMessages[result]}</p>:null}
    <section className={styles.directory} aria-labelledby="users-directory-title">
      <div className={styles.sectionHead}><div><h2 id="users-directory-title">Directório e gestão de contas</h2><p>Suspender bloqueia a renovação das sessões e o acesso normal. Reactivar exige novo início de sessão. Encerrar regista um pedido de eliminação, sujeito a revisão de retenção e dependências empresariais/financeiras.</p></div></div>
      <form className={styles.filters} method="get">
        <label className={styles.searchField}><span>Pesquisar nome ou email</span><Input name="q" defaultValue={q} maxLength={120} placeholder="Nome ou email"/></label>
        <label><span>Tipo de conta</span><Select name="tipo" defaultValue={type}><option value="">Todos</option><option value="empresa">Empresa</option><option value="parceiro">Parceiro</option><option value="profissional">Profissional</option></Select></label>
        <label><span>Estado</span><Select name="estado" defaultValue={status}><option value="">Todos</option><option value="ACTIVE">Activa</option><option value="INACTIVE">Suspensa</option><option value="DELETED">Eliminação solicitada</option></Select></label>
        <label><span>Acesso global</span><Select name="acesso" defaultValue={access}><option value="">Todos</option><option value="admin_activo">Admin activo</option><option value="admin_inactivo">Admin inactivo</option><option value="sem_admin">Sem acesso global</option></Select></label>
        <label><span>Associação</span><Select name="associacao" defaultValue={association}><option value="">Todas</option><option value="com_empresa">Com empresa</option><option value="sem_empresa">Sem empresa</option></Select></label>
        <div className={styles.filterActions}><button className="btn primary" type="submit">Pesquisar</button>{q||type||status||access||association?<Link className="btn" href="/dashboard/admin/usuarios">Limpar filtros</Link>:null}</div>
      </form>
      {error?<div className="notice" role="alert">Não foi possível carregar os utilizadores. A listagem foi bloqueada em vez de apresentar resultados incompletos.</div>:users.length?<><div className={styles.tableMeta}><span>A mostrar <strong>{(currentPage-1)*pageSize+1}–{(currentPage-1)*pageSize+users.length}</strong> de <strong>{total.toLocaleString("pt-MZ")}</strong></span><span>{activeCount} activos nesta página · {deletionRequests} pedidos de eliminação</span></div>
        <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Utilizador</th><th>Tipo</th><th>Estado</th><th>Acesso global</th><th>Empresas associadas</th><th>Registo</th><th>Operações</th></tr></thead><tbody>
          {users.map((profile:any)=>{const businesses=Array.isArray(profile.businesses)?profile.businesses:[];const statusClass=profile.account_status==="ACTIVE"?styles.statusActive:styles.statusCritical;
            return <tr key={profile.id}><td><div className={styles.userCell}><span className={styles.avatar}>{(profile.full_name?.trim()||"?").slice(0,1).toLocaleUpperCase("pt-MZ")}</span><span className={styles.userInfo}><strong>{profile.full_name?.trim()||"Nome não indicado"}</strong><small>{profile.email}</small><small>{profile.id}</small>{profile.deletion_requested_at?<em>Pedido de eliminação registado</em>:null}</span></div></td>
              <td><span className={styles.typeLabel}>{userTypes[profile.user_type]||profile.user_type||"—"}</span></td>
              <td><span className={`${styles.status} ${statusClass}`}>{accountStatuses[profile.account_status]||profile.account_status||"—"}</span></td>
              <td>{profile.platform_role?<div className={styles.accessCell}><strong>{profile.platform_role}</strong><span className={`${styles.status} ${profile.platform_active?styles.statusActive:styles.statusNeutral}`}>{profile.platform_active?"Activo":"Inactivo"}</span></div>:<span className={styles.secondary}>Sem acesso global</span>}</td>
              <td>{businesses.length?<div className={styles.businessList}>{businesses.slice(0,2).map((b:any,i:number)=><span key={profile.id+"-"+i}>{b.name}<small> · {b.role}</small></span>)}{businesses.length>2?<small>+{businesses.length-2} outras</small>:null}</div>:<span className={styles.secondary}>Sem associação</span>}</td>
              <td><span className={styles.date}>{new Date(profile.created_at).toLocaleDateString("pt-MZ")}</span>{profile.deactivated_at?<small className={styles.subDate}>Desactivado: {new Date(profile.deactivated_at).toLocaleDateString("pt-MZ")}</small>:null}</td>
              <td><div className={styles.operations}>{profile.id!==user.id?<form action={setManagedAccountStatus}><input type="hidden" name="userId" value={profile.id}/><select name="status" defaultValue={profile.account_status||"ACTIVE"} aria-label="Novo estado da conta"><option value="ACTIVE">Reactivar</option><option value="INACTIVE">Suspender</option><option value="DELETED">Encerrar / pedido de eliminação</option></select><input name="reason" minLength={8} maxLength={500} required placeholder="Justificação (mín. 8 caracteres)" aria-label="Justificação da alteração"/><button className="btn primary" type="submit">Aplicar</button></form>:<span className={styles.secondary}>Conta administrativa actual</span>}<form action={sendManagedPasswordRecovery}><input type="hidden" name="userId" value={profile.id}/><button className="btn" type="submit">Enviar recuperação</button></form></div></td>
            </tr>})}
        </tbody></table></div><nav className={styles.pagination} aria-label="Paginação"><span>Página {currentPage} de {pageCount}</span><div>{currentPage>1?<Link className="btn" href={pageHref(currentPage-1)}>← Anterior</Link>:<span className={styles.secondary}>← Anterior</span>}{currentPage<pageCount?<Link className="btn" href={pageHref(currentPage+1)}>Seguinte →</Link>:<span className={styles.secondary}>Seguinte →</span>}</div></nav></>:<div className={styles.emptyState}><strong>{q||type||status||access||association?"Nenhum perfil corresponde aos filtros.":"Não existem perfis para apresentar."}</strong><span>Experimente alterar ou limpar os filtros.</span></div>}
    </section>
    <section className={styles.directory} aria-labelledby="account-audit-title"><div className={styles.sectionHead}><div><h2 id="account-audit-title">Histórico administrativo</h2><p>Suspensões, reativações, pedidos de eliminação e recuperações de password.</p></div></div>
      {auditError?<div className="notice" role="alert">Não foi possível carregar o histórico.</div>:audit?.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Data</th><th>Acção</th><th>Conta afectada</th><th>Responsável</th><th>Estado</th><th>Justificação</th></tr></thead><tbody>{audit.map((event:any)=><tr key={event.id}><td>{new Date(event.created_at).toLocaleString("pt-MZ")}</td><td>{event.action}</td><td>{event.target_user_id}</td><td>{event.actor_user_id||"Sistema"}</td><td>{event.status_from||"—"} → {event.status_to||"—"}</td><td>{event.metadata?.reason||"—"}</td></tr>)}</tbody></table></div>:<div className={styles.emptyState}><strong>Ainda não existem decisões administrativas de conta.</strong><span>As próximas operações serão registadas automaticamente.</span></div>}
    </section>
  </div></main>;
}
