import { getSuperAdminContext } from "@/lib/auth/super-admin";
import styles from "./reconciliacao.module.css";

export const dynamic = "force-dynamic";

type Issue = { issue_code:string; entity_type:string; record_id:string; account_id:string|null; details:Record<string,unknown> };
type Reconciliation = {
  generated_at?:string; contracts_checked?:number; engagements_checked?:number;
  reports_checked?:number; campaigns_checked?:number; entitlements_checked?:number;
  partner_payments_checked?:number; partner_financial_documents_checked?:number;
  total_issues?:number; issue_counts?:Record<string,number>; issues?:Issue[];
};

const labels:Record<string,string> = {
 CONTRACT_PARTNER_NOT_ACTIVE:"Contrato activo ligado a entidade inactiva",
 CONTRACT_ACTIVE_MISSING_APPROVAL:"Contrato activo sem aprovação registada",
 CONTRACT_ACTIVE_MISSING_SIGNED_DOCUMENT:"Contrato activo sem documento assinado",
 CONTRACT_ACTIVE_EXPIRED:"Contrato activo com prazo terminado",
 ENGAGEMENT_CONTRACT_PARTNER_MISMATCH:"Execução e contrato pertencem a entidades diferentes",
 ENGAGEMENT_CAMPAIGN_PARTNER_MISMATCH:"Execução e campanha pertencem a entidades diferentes",
 ENGAGEMENT_CLOSED_MISSING_TIMESTAMP:"Execução encerrada sem data de encerramento",
 ENGAGEMENT_DELIVERED_MISSING_TIMESTAMP:"Execução entregue sem data de entrega",
 REPORT_PARTNER_CONTRACT_MISMATCH:"Relatório e contrato pertencem a entidades diferentes",
 REPORT_PARTNER_ENGAGEMENT_MISMATCH:"Relatório e execução pertencem a entidades diferentes",
 REPORT_PARTNER_CAMPAIGN_MISMATCH:"Relatório e campanha pertencem a entidades diferentes",
 REPORT_DELIVERED_MISSING_EVIDENCE:"Entrega marcada como concluída sem evidência suficiente",
 REPORT_READY_OR_DELIVERED_MISSING_ASSET:"Relatório pronto/concluído sem ficheiro ou link",
 REPORT_EMAIL_WITHOUT_RECIPIENTS:"Relatório por email sem destinatários",
 CAMPAIGN_CONTRACT_PARTNER_MISMATCH:"Campanha e contrato pertencem a entidades diferentes",
 ENTITLEMENT_PARTNER_NOT_ACTIVE:"Benefício activo ligado a entidade inactiva",
 PAYMENT_CONTRACT_PARTNER_MISMATCH:"Pagamento e contrato pertencem a entidades diferentes",
 PAYMENT_ENGAGEMENT_PARTNER_MISMATCH:"Pagamento e execução pertencem a entidades diferentes",
 PAYMENT_DOCUMENT_PARTNER_MISMATCH:"Pagamento e documento financeiro pertencem a entidades diferentes",
 FINANCIAL_DOCUMENT_CONTRACT_PARTNER_MISMATCH:"Documento financeiro e contrato pertencem a entidades diferentes",
 FINANCIAL_DOCUMENT_ENGAGEMENT_PARTNER_MISMATCH:"Documento financeiro e execução pertencem a entidades diferentes",
 FINANCIAL_DOCUMENT_CAMPAIGN_PARTNER_MISMATCH:"Documento financeiro e campanha pertencem a entidades diferentes",
};

export default async function PartnerReconciliationPage(){
 const {supabase,authorized}=await getSuperAdminContext();
 if(!authorized) return null;
 const {data,error}=await supabase.rpc("admin_partner_operational_reconciliation_f361");
 const result=(data??{}) as Reconciliation;
 const issues=result.issues??[];
 const checked=(result.contracts_checked??0)+(result.engagements_checked??0)+(result.reports_checked??0)+(result.campaigns_checked??0)+(result.entitlements_checked??0)+(result.partner_payments_checked??0)+(result.partner_financial_documents_checked??0);
 return <main className={`dashboard-main admin-workspace ${styles.page}`}><div className={`dashboard-content ${styles.content}`}>
  <header className={styles.hero}><div><span>Backoffice institucional · F3.61</span><h1>Conciliação operacional</h1><p>Verificação transversal de contratos, execuções, campanhas, relatórios, benefícios, pagamentos e documentos financeiros. Esta consulta é apenas de leitura e não altera registos.</p></div><a href="/dashboard/admin/parceiros/gestao">Voltar à gestão de parceiros</a></header>
  {error?<div className={styles.error}>Não foi possível executar a conciliação. Confirme as permissões e tente novamente.</div>:null}
  <section className={styles.metrics}>
   <article><span>Registos verificados</span><strong>{checked}</strong></article>
   <article><span>Inconsistências</span><strong>{result.total_issues??"—"}</strong></article>
   <article><span>Contratos</span><strong>{result.contracts_checked??0}</strong></article>
   <article><span>Execuções e relatórios</span><strong>{(result.engagements_checked??0)+(result.reports_checked??0)}</strong></article>
   <article><span>Pagamentos e documentos</span><strong>{(result.partner_payments_checked??0)+(result.partner_financial_documents_checked??0)}</strong></article>
  </section>
  <section className={styles.panel}><div className={styles.panelHead}><div><h2>Inconsistências detectadas</h2><p>Máximo de 250 ocorrências por execução. Os totais por tipo abrangem todos os registos encontrados.</p></div><span>{result.generated_at?new Date(result.generated_at).toLocaleString("pt-MZ",{timeZone:"Africa/Maputo"}):"—"}</span></div>
   {error?null:issues.length===0?<p className={styles.clean}>Não foram detectadas inconsistências nos registos actualmente existentes.</p>:<div className={styles.tableWrap}><table><thead><tr><th>Tipo de inconsistência</th><th>Registo</th><th>Entidade</th><th>Detalhes</th></tr></thead><tbody>{issues.map(x=><tr key={x.issue_code+x.record_id}><td>{labels[x.issue_code]??x.issue_code}</td><td>{x.entity_type} · {x.record_id.slice(0,8)}</td><td>{x.account_id??"—"}</td><td><code>{JSON.stringify(x.details)}</code></td></tr>)}</tbody></table></div>}
  </section>
  <section className={styles.panel}><h2>Contagem por tipo</h2><div className={styles.counts}>{Object.entries(result.issue_counts??{}).sort((a,b)=>b[1]-a[1]).map(([code,count])=><div key={code}><span>{labels[code]??code}</span><strong>{count}</strong></div>)}</div></section>
 </div></main>;
}
