import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { updatePartnerContractRenewal } from "@/lib/admin/partner-institutional-actions";
import styles from "./controlo.module.css";

export const dynamic="force-dynamic";
type Engagement={id:string;account_name:string;title:string;service_type:string;status:string;received_at:string;due_at:string|null;assigned_commercial_user_id:string|null;assigned_operations_user_id:string|null;days_open:number;days_overdue:number};
type Report={id:string;account_name:string;title:string;status:string;delivery_channel:string;recipient_count:number;created_at:string;period_end:string|null};
type Renewal={id:string;account_name:string;contract_code:string;title:string;status:string;ends_on:string|null;renewal_status:string;renewal_due_on:string|null;renewal_owner_user_id:string|null;renewal_notes:string|null;days_to_expiry:number|null};
type Dashboard={generated_at:string;engagements_open:number;engagements_overdue:number;engagements_due_7_days:number;engagements_unassigned:number;reports_pending:number;contracts_expired_active:number;contracts_expiring_30_days:number;contracts_expiring_90_days:number;renewals_in_progress:number;engagements:Engagement[];reports:Report[];renewals:Renewal[]};
const fmtDate=(v:string|null)=>v?new Date(v).toLocaleDateString("pt-MZ",{timeZone:"Africa/Maputo"}):"Sem prazo";
const engagementStatus:Record<string,string>={RECEIVED:"Recebido",SCOPING:"Em definição",AWAITING_APPROVAL:"A aguardar aprovação",APPROVED:"Aprovado",IN_PROGRESS:"Em execução",UNDER_REVIEW:"Em revisão",DELIVERED:"Entregue",CLOSED:"Encerrado",ON_HOLD:"Em espera",CANCELLED:"Cancelado"};
const renewalStatus:Record<string,string>={NOT_REVIEWED:"Por avaliar",REVIEW_REQUIRED:"Revisão necessária",IN_PROGRESS:"Renovação em curso",RENEWED:"Renovado",NON_RENEWAL:"Não renovar"};
export default async function PartnerControlPage({searchParams}:{searchParams:Promise<{error?:string;saved?:string}>}){
 const {supabase,authorized}=await getSuperAdminContext();if(!authorized)return null;
 const params=await searchParams;
 const [{data,error},{data:staffData}]=await Promise.all([
  supabase.rpc("admin_partner_execution_renewal_dashboard_f362"),
  supabase.rpc("admin_list_platform_staff")
 ]);
 const d=(data??{}) as Dashboard, staff=(staffData??[]) as Array<{user_id:string;full_name:string;role:string}>;
 const staffName=(id:string|null)=>staff.find(x=>x.user_id===id)?.full_name||"Não atribuído";
 const errors:Record<string,string>={renewal:"Não foi possível actualizar o plano de renovação. Confirme o estado, responsável, prazo e justificação."};
 return <main className={`dashboard-main admin-workspace ${styles.page}`}><div className={`dashboard-content ${styles.content}`}>
  <header className={styles.hero}><div><span>Backoffice institucional · F3.62 / F3.63</span><h1>Controlo e continuidade</h1><p>Acompanhamento das execuções, entregas pendentes e continuidade dos contratos institucionais. Os indicadores são calculados a partir dos registos operacionais existentes.</p></div><a href="/dashboard/admin/parceiros/gestao">Gestão de parceiros</a></header>
  {params.error?<div className={styles.error}>{errors[params.error]??"Não foi possível concluir a operação."}</div>:null}
  {params.saved?<div className={styles.success}>Plano de renovação actualizado e registado no histórico.</div>:null}
  {error?<div className={styles.error}>Não foi possível carregar o painel. Verifique as permissões e tente novamente.</div>:<>
   <section className={styles.metrics}>
    <article><span>Execuções abertas</span><strong>{d.engagements_open??0}</strong></article>
    <article><span>Execuções fora do prazo</span><strong>{d.engagements_overdue??0}</strong></article>
    <article><span>Sem responsável</span><strong>{d.engagements_unassigned??0}</strong></article>
    <article><span>Relatórios pendentes</span><strong>{d.reports_pending??0}</strong></article>
    <article><span>Contratos activos expirados</span><strong>{d.contracts_expired_active??0}</strong></article>
   </section>
   <section className={styles.panel}><div className={styles.panelHead}><div><h2>1. Controlo de execução e prestação de contas</h2><p>Priorize prazos vencidos, ordens sem responsável e entregas de relatórios por concluir.</p></div><span>Actualizado: {d.generated_at?new Date(d.generated_at).toLocaleString("pt-MZ",{timeZone:"Africa/Maputo"}):"—"}</span></div>
    <div className={styles.submetrics}><span>Prazo nos próximos 7 dias: <b>{d.engagements_due_7_days??0}</b></span><span>Relatórios por concluir: <b>{d.reports_pending??0}</b></span></div>
    <h3>Execuções abertas</h3>
    {(d.engagements??[]).length===0?<p className={styles.empty}>Não existem execuções abertas registadas.</p>:<div className={styles.tableWrap}><table><thead><tr><th>Entidade / execução</th><th>Estado</th><th>Prazo</th><th>Responsáveis</th><th>Acompanhamento</th></tr></thead><tbody>{d.engagements.map(e=><tr key={e.id}><td><b>{e.account_name}</b><small>{e.title}</small></td><td>{engagementStatus[e.status]??e.status}</td><td>{fmtDate(e.due_at)}</td><td><small>Comercial: {staffName(e.assigned_commercial_user_id)}</small><small>Operações: {staffName(e.assigned_operations_user_id)}</small></td><td>{e.days_overdue>0?<span className={styles.overdue}>{e.days_overdue} dia(s) em atraso</span>:<span>{e.days_open} dia(s) aberta</span>}</td></tr>)}</tbody></table></div>}
    <h3>Relatórios por concluir</h3>
    {(d.reports??[]).length===0?<p className={styles.empty}>Não existem relatórios pendentes.</p>:<div className={styles.tableWrap}><table><thead><tr><th>Entidade / relatório</th><th>Estado</th><th>Canal</th><th>Destinatários</th><th>Período até</th></tr></thead><tbody>{d.reports.map(r=><tr key={r.id}><td><b>{r.account_name}</b><small>{r.title}</small></td><td>{r.status}</td><td>{r.delivery_channel}</td><td>{r.recipient_count}</td><td>{fmtDate(r.period_end)}</td></tr>)}</tbody></table></div>}
   </section>
   <section className={styles.panel}><div className={styles.panelHead}><div><h2>2. Continuidade institucional e renovação contratual</h2><p>Identifique contratos próximos do termo e registe a decisão de renovação, o responsável e a data de seguimento.</p></div></div>
    <div className={styles.submetrics}><span>Terminam em 30 dias: <b>{d.contracts_expiring_30_days??0}</b></span><span>Terminam em 90 dias: <b>{d.contracts_expiring_90_days??0}</b></span><span>Renovações em curso: <b>{d.renewals_in_progress??0}</b></span></div>
    {(d.renewals??[]).length===0?<p className={styles.empty}>Não existem contratos activos/suspensos com termo nos próximos 90 dias ou planos de renovação já iniciados.</p>:<div className={styles.renewals}>{d.renewals.map(c=><article key={c.id} className={styles.renewalCard}><div className={styles.contractInfo}><span>{c.contract_code} · {c.account_name}</span><h3>{c.title}</h3><p>Estado: {c.status} · Termo: {fmtDate(c.ends_on)} · {c.days_to_expiry===null?"Sem data":c.days_to_expiry<0?Math.abs(c.days_to_expiry)+" dia(s) expirado":c.days_to_expiry+" dia(s) restantes"}</p></div>
     <form action={updatePartnerContractRenewal} className={styles.renewalForm}><input type="hidden" name="contract_id" value={c.id}/><label>Decisão<select name="renewal_status" defaultValue={c.renewal_status}><option value="NOT_REVIEWED">Por avaliar</option><option value="REVIEW_REQUIRED">Revisão necessária</option><option value="IN_PROGRESS">Renovação em curso</option><option value="RENEWED">Renovado</option><option value="NON_RENEWAL">Não renovar</option></select></label><label>Responsável<select name="renewal_owner_user_id" defaultValue={c.renewal_owner_user_id??""}><option value="">Não atribuído</option>{staff.map(s=><option key={s.user_id} value={s.user_id}>{s.full_name||"Utilizador interno"} · {s.role}</option>)}</select></label><label>Data de seguimento<input type="date" name="renewal_due_on" defaultValue={c.renewal_due_on??""}/></label><label>Justificação / próximo passo<textarea name="renewal_notes" minLength={8} maxLength={1000} required defaultValue={c.renewal_notes??""} placeholder="Registe a decisão, contacto previsto ou motivo de não renovação"/></label><button type="submit">Guardar plano</button></form>
    </article>)}</div>}
   </section>
  </>}
 </div></main>;
}
