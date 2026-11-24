import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { updatePartnerContractRenewal } from "@/lib/admin/partner-institutional-actions";
import styles from "./controlo.module.css";

export const dynamic="force-dynamic";
type Engagement={id:string;account_name:string;title:string;service_type:string;status:string;received_at:string;due_at:string|null;assigned_commercial_user_id:string|null;assigned_operations_user_id:string|null;days_open:number;days_overdue:number};
type Report={id:string;account_name:string;title:string;status:string;delivery_channel:string;recipient_count:number;created_at:string;period_end:string|null};
type Renewal={id:string;account_name:string;contract_code:string;title:string;status:string;ends_on:string|null;renewal_status:string;renewal_due_on:string|null;renewal_owner_user_id:string|null;renewal_notes:string|null;days_to_expiry:number|null};
type PerformanceAccount={account_id:string;account_name:string;account_status:string;operating_model:string;portal_enabled:boolean;relationship_status:string;risk_signals:Record<string,number>;engagements_total:number;engagements_completed:number;engagements_overdue:number;engagements_unassigned:number;engagements_delivered_late:number;engagement_completion_rate:number|null;reports_total:number;reports_delivered:number;reports_pending:number;reports_failed:number;report_delivery_rate:number|null;contracts_active:number;contracts_expired_active:number;contracts_expiring_30:number;contracts_expiring_90:number;active_entitlements:number;active_campaigns:number};
type Performance={generated_at:string;accounts_total:number;accounts_critical:number;accounts_follow_up:number;accounts_on_track:number;accounts_insufficient_data:number;accounts:PerformanceAccount[]};
type Dashboard={generated_at:string;engagements_open:number;engagements_overdue:number;engagements_due_7_days:number;engagements_unassigned:number;reports_pending:number;contracts_expired_active:number;contracts_expiring_30_days:number;contracts_expiring_90_days:number;renewals_in_progress:number;engagements:Engagement[];reports:Report[];renewals:Renewal[]};
const fmtDate=(v:string|null)=>v?new Date(v).toLocaleDateString("pt-MZ",{timeZone:"Africa/Maputo"}):"Sem prazo";
const engagementStatus:Record<string,string>={RECEIVED:"Recebido",SCOPING:"Em definição",AWAITING_APPROVAL:"A aguardar aprovação",APPROVED:"Aprovado",IN_PROGRESS:"Em execução",UNDER_REVIEW:"Em revisão",DELIVERED:"Entregue",CLOSED:"Encerrado",ON_HOLD:"Em espera",CANCELLED:"Cancelado"};
const renewalStatus:Record<string,string>={NOT_REVIEWED:"Por avaliar",REVIEW_REQUIRED:"Revisão necessária",IN_PROGRESS:"Renovação em curso",RENEWED:"Renovado",NON_RENEWAL:"Não renovar"};
export default async function PartnerControlPage({searchParams}:{searchParams:Promise<{error?:string;saved?:string}>}){
 const {supabase,authorized}=await getSuperAdminContext();if(!authorized)return null;
 const params=await searchParams;
 const [{data,error},{data:staffData},{data:performanceData,error:performanceError}]=await Promise.all([
  supabase.rpc("admin_partner_execution_renewal_dashboard_f362"),
  supabase.rpc("admin_list_platform_staff"),
  supabase.rpc("admin_partner_relationship_performance_f364")
 ]);
 const performance=(performanceData??{}) as Performance;
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
   <section className={styles.panel}>
    <div className={styles.panelHead}><div><h2>3. Desempenho e risco das relações institucionais</h2><p>Indicadores objectivos derivados das execuções, relatórios, contratos, benefícios e campanhas.</p></div><span>{performance.generated_at?new Date(performance.generated_at).toLocaleString("pt-MZ",{timeZone:"Africa/Maputo"}):"—"}</span></div>
    {performanceError?<div className={styles.error}>Não foi possível carregar a avaliação institucional.</div>:<>
     <div className={styles.metrics}><article><span>Relações críticas</span><strong>{performance.accounts_critical??0}</strong></article><article><span>Exigem seguimento</span><strong>{performance.accounts_follow_up??0}</strong></article><article><span>Sem alertas</span><strong>{performance.accounts_on_track??0}</strong></article><article><span>Dados insuficientes</span><strong>{performance.accounts_insufficient_data??0}</strong></article><article><span>Total</span><strong>{performance.accounts_total??0}</strong></article></div>
     <div className={styles.legend}><span><b className={styles.critical}>Crítica</b> · execução vencida, contrato activo expirado ou relatório falhado</span><span><b className={styles.followUp}>Seguimento</b> · relatório pendente, contrato a expirar em 30 dias ou execução sem responsável</span><span><b className={styles.onTrack}>Sem alerta</b> · sem os sinais anteriores</span><span><b>Dados insuficientes</b> · sem actividade operacional ou contratual registada</span></div>
     {(performance.accounts??[]).length===0?<p className={styles.empty}>Ainda não existem entidades institucionais registadas.</p>:<div className={styles.scorecards}>{performance.accounts.map(a=><article key={a.account_id} className={styles.scorecard}>
      <div className={styles.scoreHead}><div><h3>{a.account_name}</h3><span>{a.operating_model} · {a.portal_enabled?"Portal activo":"Gestão sem portal"}</span></div><b className={a.relationship_status==="CRITICAL"?styles.critical:a.relationship_status==="FOLLOW_UP"?styles.followUp:a.relationship_status==="ON_TRACK"?styles.onTrack:styles.noData}>{a.relationship_status==="CRITICAL"?"Crítica":a.relationship_status==="FOLLOW_UP"?"Seguimento":a.relationship_status==="ON_TRACK"?"Sem alerta":"Dados insuficientes"}</b></div>
      <div className={styles.scoreMetrics}><span>Execuções concluídas <b>{a.engagements_completed}/{a.engagements_total}</b>{a.engagement_completion_rate!==null?<small>{a.engagement_completion_rate}%</small>:null}</span><span>Em atraso <b>{a.engagements_overdue}</b></span><span>Entregas tardias <b>{a.engagements_delivered_late}</b></span><span>Relatórios entregues <b>{a.reports_delivered}/{a.reports_total}</b>{a.report_delivery_rate!==null?<small>{a.report_delivery_rate}%</small>:null}</span><span>Relatórios pendentes/falhados <b>{a.reports_pending}/{a.reports_failed}</b></span><span>Contratos expirados <b>{a.contracts_expired_active}</b></span><span>Contratos a expirar (30 dias) <b>{a.contracts_expiring_30}</b></span><span>Benefícios/campanhas activos <b>{a.active_entitlements}/{a.active_campaigns}</b></span></div>
      {Object.keys(a.risk_signals??{}).length>0?<div className={styles.riskSignals}>{Object.entries(a.risk_signals).map(([key,value])=><span key={key}>{key.replaceAll("_"," ")}: <b>{String(value)}</b></span>)}</div>:null}
     </article>)}</div>}
    </>}
   </section>
  </>}
 </div></main>;
}
