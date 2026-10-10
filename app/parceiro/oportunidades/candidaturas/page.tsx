export const dynamic="force-dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PartnerPage, PartnerSection, PartnerEmpty } from "@/components/partner-workspace";
import { changeOpportunityApplicationStatus } from "@/lib/opportunities/partner-actions";

const statuses:Record<string,string>={SUBMITTED:"Recebida",DRAFT:"Rascunho",UNDER_REVIEW:"Em análise",SHORTLISTED:"Pré-seleccionada",ACCEPTED:"Aceite",REJECTED:"Não seleccionada",WITHDRAWN:"Retirada"};
const dateLabel=(v:string|null)=>v?new Date(v).toLocaleString("pt-MZ",{dateStyle:"medium",timeStyle:"short"}):"Data não indicada";

export default async function PartnerOpportunityApplicationsPage({searchParams}:{searchParams?:Promise<{updated?:string;error?:string}>}) {
 const params=searchParams?await searchParams:{};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return null;
 const {data:opportunities,error:opError}=await supabase.from("opportunities").select("id,title,slug,status").eq("owner_id",user.id).order("created_at",{ascending:false});
 const ids=(opportunities||[]).map((x:any)=>x.id);
 const {data:applications,error:appError}=ids.length?await supabase.from("opportunity_applications").select("id,opportunity_id,applicant_user_id,applicant_business_id,cover_note,status,submitted_at,created_at").in("opportunity_id",ids).order("created_at",{ascending:false}):{data:[],error:null};
 const businessIds=[...new Set((applications||[]).map((x:any)=>x.applicant_business_id).filter(Boolean))];
 const applicantIds=[...new Set((applications||[]).map((x:any)=>x.applicant_user_id).filter(Boolean))];
 const [{data:businesses},{data:profiles}]=await Promise.all([
  businessIds.length?supabase.from("businesses").select("id,name").in("id",businessIds):Promise.resolve({data:[]}),
  applicantIds.length?supabase.from("profiles").select("id,full_name").in("id",applicantIds):Promise.resolve({data:[]})
 ]);
 const oppById=new Map((opportunities||[]).map((x:any)=>[x.id,x]));
 const businessById=new Map((businesses||[]).map((x:any)=>[x.id,x.name]));
 const profileById=new Map((profiles||[]).map((x:any)=>[x.id,x.full_name]));
 const rows=applications||[];
 return <PartnerPage eyebrow="Oportunidades · Respostas" title="Candidaturas recebidas" description="Consulte as respostas submetidas às suas oportunidades e actualize o estado de acompanhamento." action={{href:"/parceiro/oportunidades",label:"Voltar às publicações"}}>
  {params.updated&&<div className="notice">Estado actualizado.</div>}
  {params.error&&<div className="notice">Não foi possível actualizar o estado. Confirme as permissões da sua conta.</div>}
  {opError||appError?<div className="partner-pub-empty"><strong>Não foi possível carregar todas as candidaturas.</strong><p>Verifique as permissões de leitura da conta. Não alterámos as políticas de acesso da base de dados.</p></div>:<PartnerSection eyebrow="Acompanhamento" title={rows.length+" resposta"+(rows.length===1?"":"s")} description="Os dados apresentados são limitados às oportunidades que a sua conta consegue consultar.">
   {rows.length?<div className="partner-applications-list">{rows.map((app:any)=>{const opp=oppById.get(app.opportunity_id);return <article key={app.id} className="partner-application-card">
    <div className="partner-application-top"><div><span className="partner-kicker">Oportunidade</span><h3>{opp?.title||"Oportunidade"}</h3><small>{dateLabel(app.submitted_at||app.created_at)}</small></div><span className={"partner-pub-status "+(app.status==="SUBMITTED"?"published":app.status==="REJECTED"||app.status==="WITHDRAWN"?"closed":"draft")}>{statuses[app.status]||app.status}</span></div>
    <div className="partner-application-applicant"><strong>{app.applicant_business_id?businessById.get(app.applicant_business_id)||"Empresa candidata":"Candidato/a"}</strong><small>{profileById.get(app.applicant_user_id)||"Utilizador registado"} · referência {String(app.applicant_user_id).slice(0,8)}</small></div>
    {app.cover_note&&<p className="partner-application-note">{app.cover_note}</p>}
    <form action={changeOpportunityApplicationStatus} className="partner-application-actions"><input type="hidden" name="application_id" value={app.id}/><label>Estado<select name="status" defaultValue={app.status==="SUBMITTED"?"UNDER_REVIEW":app.status}><option value="UNDER_REVIEW">Em análise</option><option value="SHORTLISTED">Pré-seleccionada</option><option value="ACCEPTED">Aceite</option><option value="REJECTED">Não seleccionada</option><option value="WITHDRAWN">Retirada</option></select></label><button className="btn primary" type="submit">Actualizar estado</button></form>
   </article>})}</div>:<PartnerEmpty title="Ainda não recebeu candidaturas" description="Quando alguém submeter uma resposta a uma das suas oportunidades, poderá acompanhar aqui o estado e as notas enviadas." action={{href:"/parceiro/oportunidades",label:"Ver publicações"}}/>}
  </PartnerSection>}
  <style>{`.partner-applications-list{display:grid;gap:12px}.partner-application-card{border:1px solid var(--border,#dbe3e0);border-radius:15px;background:var(--surface,#fff);padding:20px}.partner-application-top{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.partner-application-top h3{margin:5px 0;font-size:18px}.partner-application-top small,.partner-application-applicant small{display:block;color:var(--muted,#687572);font-size:12px}.partner-application-applicant{display:grid;gap:4px;padding:13px 0}.partner-application-note{white-space:pre-wrap;background:var(--surface-muted,#f5f7f6);border-radius:10px;padding:12px;font-size:13px;line-height:1.6}.partner-application-actions{display:flex;align-items:end;gap:10px;flex-wrap:wrap;border-top:1px solid var(--border,#dbe3e0);padding-top:14px}.partner-application-actions label{display:grid;gap:6px;font-size:12px;font-weight:700}.partner-application-actions select{min-width:200px;padding:10px;border:1px solid var(--border,#dbe3e0);border-radius:9px;background:var(--surface,#fff)}@media(max-width:600px){.partner-application-top{flex-direction:column}.partner-application-actions{display:grid;grid-template-columns:1fr}.partner-application-actions select,.partner-application-actions button{width:100%;box-sizing:border-box}}`}</style>
 </PartnerPage>
}
