export const dynamic="force-dynamic";
import Link from"next/link";
import{createClient}from"@/lib/supabase/server";
import{PartnerPage,PartnerSection,PartnerMetric,PartnerEmpty}from"@/components/partner-workspace";

const labels:Record<string,string>={FUNDING:"Financiamento",PROGRAM:"Programa / Candidatura",AWARD_SCHOLARSHIP:"Bolsa / Prémio",PARTNERSHIP:"Parceria / Cooperação",EXPRESSION_OF_INTEREST:"Manifestação de Interesse",CALL:"Chamada · anterior",TENDER:"Concurso · anterior",TRAINING:"Capacitação · anterior",EVENT:"Evento · anterior",BUSINESS:"Negócio · anterior",OTHER:"Outro · anterior"};

export default async function PartnerOpportunitiesPage(){
 const s=await createClient();const{data:{user}}=await s.auth.getUser();if(!user)return null;
 const{data}=await s.from("opportunities").select("id,title,slug,type,organization,location,closes_at,status,created_at").eq("owner_id",user.id).order("created_at",{ascending:false}).limit(50);
 const rows=data??[],published=rows.filter((x:any)=>x.status==="PUBLISHED").length,drafts=rows.filter((x:any)=>x.status==="DRAFT").length,closed=rows.filter((x:any)=>["CLOSED","ARCHIVED"].includes(x.status)).length;
 return <PartnerPage eyebrow="Actividade · Publicação" title="Publicar e gerir oportunidades" description="Publique apenas processos em que o público possa candidatar-se, manifestar interesse, obter um benefício ou estabelecer cooperação com a sua organização." action={{href:"/parceiro/oportunidades/nova",label:"Nova oportunidade"}}>
  <section className="partner-metrics-grid"><PartnerMetric label="Publicadas" value={published} detail="Visíveis no ecossistema" featured/><PartnerMetric label="Rascunhos" value={drafts} detail="A preparar"/><PartnerMetric label="Encerradas" value={closed} detail="Histórico da entidade"/><PartnerMetric label="Total" value={rows.length} detail="Publicações"/></section>
  <PartnerSection eyebrow="Gestão" title="Publicações da sua entidade" description="Acompanhe estado, prazo e histórico sem misturar concursos, produtos ou publicidade.">
   {rows.length?<div className="partner-opportunity-list">{rows.map((x:any)=><Link href={x.status==="PUBLISHED"?"/oportunidades/"+x.slug:"/parceiro/oportunidades/nova?editar="+x.id} key={x.id} className="partner-opportunity-row"><div><span>{labels[x.type]||x.type||"Oportunidade"} · {x.status}</span><strong>{x.title}</strong><small>{x.organization||"A sua entidade"} · {x.location||"Localização não indicada"} · {x.closes_at?"encerra "+new Date(x.closes_at).toLocaleDateString("pt-MZ"):"sem prazo"}</small></div><b>{x.status==="PUBLISHED"?"Ver →":"Editar →"}</b></Link>)}</div>:<PartnerEmpty title="Ainda não publicou uma oportunidade" text="Comece por uma oportunidade de financiamento, programa/candidatura, bolsa/prémio, parceria ou manifestação de interesse." href="/parceiro/oportunidades/nova" label="Publicar primeira oportunidade"/>}
  </PartnerSection>
  <section className="partner-opportunity-boundary"><div><span>Oportunidades</span><strong>Publicar algo para participação externa.</strong></div><div className="boundary-links"><Link href="/parceiro/publicidade">Publicidade →</Link><Link href="/parceiro/servicos">Produtos de valor →</Link></div></section>
 </PartnerPage>
}