import Link from"next/link";
import{notFound}from"next/navigation";
import{createClient}from"@/lib/supabase/server";
import{applyToOpportunity}from"@/lib/opportunities/actions";

const labels:Record<string,string>={FUNDING:"Financiamento",PROGRAM:"Desenvolvimento empresarial",YOUTH_INITIATIVE:"Iniciativa juvenil",TRAINING:"Formação e capacitação",ENTREPRENEUR_SUPPORT:"Apoio a empreendedores",EXPORT_INTERNATIONAL:"Exportação e internacionalização",AWARD_SCHOLARSHIP:"Bolsa / Prémio",PARTNERSHIP:"Parceria / Cooperação",EXPRESSION_OF_INTEREST:"Manifestação de interesse",INNOVATION_TECH:"Inovação e tecnologia",CALL:"Chamada · publicação anterior",EVENT:"Evento · publicação anterior",BUSINESS:"Negócio · publicação anterior",OTHER:"Publicação anterior"};
const icons:Record<string,string>={FUNDING:"◈",PROGRAM:"↗",YOUTH_INITIATIVE:"✦",TRAINING:"◇",ENTREPRENEUR_SUPPORT:"⌘",EXPORT_INTERNATIONAL:"↗",AWARD_SCHOLARSHIP:"✦",PARTNERSHIP:"⌘",EXPRESSION_OF_INTEREST:"◎",INNOVATION_TECH:"✧",CALL:"↗",EVENT:"◷",BUSINESS:"◆",OTHER:"•"};
function dateLabel(value:string|null){return value?new Date(value).toLocaleDateString("pt-MZ",{day:"2-digit",month:"long",year:"numeric"}):"Não indicado"}

export default async function OpportunityDetail({params}:{params:Promise<{slug:string}>}){
 const{slug}=await params;const supabase=await createClient();const{data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub||null;
 const{data:item}=await supabase.from("opportunities").select("id,title,slug,type,status,description,organization,location,opens_at,closes_at,requirements,created_at").eq("slug",slug).eq("status","PUBLISHED").maybeSingle();
 if(!item||!labels[item.type])notFound();
 const[{data:application},{data:businesses},{data:attachments}]=await Promise.all([
  userId?supabase.from("opportunity_applications").select("status").eq("opportunity_id",item.id).eq("applicant_user_id",userId).maybeSingle():Promise.resolve({data:null}),
  userId?supabase.from("businesses").select("id,name").eq("owner_id",userId).order("name"):Promise.resolve({data:[]}),
  supabase.from("publication_attachments").select("id,file_name,mime_type,storage_path,kind").eq("resource_type","OPPORTUNITY").eq("resource_id",item.id).order("created_at")
 ]);
 const now=Date.now();const opensAt=item.opens_at?new Date(item.opens_at):null;const deadline=item.closes_at?new Date(item.closes_at):null;const notOpenYet=Boolean(opensAt&&opensAt.getTime()>now);const isClosed=Boolean(deadline&&deadline.getTime()<now);const canApply=!notOpenYet&&!isClosed;
 const actionLabel=item.type==="FUNDING"?"Apresentar interesse / candidatura":item.type==="PARTNERSHIP"?"Contactar para cooperação":item.type==="EXPRESSION_OF_INTEREST"?"Manifestar interesse":item.type==="AWARD_SCHOLARSHIP"?"Candidatar-se":"Participar / candidatar-se";

 return <><main className="opportunity-detail-page opportunity-detail-new"><div className="container">
  <Link href="/oportunidades" className="opportunity-back">← Voltar às oportunidades</Link>
  <section className="opportunity-detail-hero">
   <div className="opportunity-detail-main">
    <div className="opportunity-detail-tags"><span className="opportunity-pill">{icons[item.type]} {labels[item.type]}</span>{item.location&&<span className="detail-neutral-tag">⌖ {item.location}</span>}</div>
    <h1>{item.title}</h1><p>{item.description}</p>
    <div className="opportunity-detail-source"><span>Publicado por</span><strong>{item.organization||"Organização não indicada"}</strong></div>
   </div>
   <aside className="opportunity-deadline-card opportunity-action-card">
    <span>{item.closes_at?"Prazo para participação":"Participação"}</span><strong>{dateLabel(item.closes_at)}</strong>{deadline&&<small>Encerra {deadline.toLocaleDateString("pt-MZ",{weekday:"long"})}</small>}
    {notOpenYet?<p className="notice">As candidaturas abrem em {dateLabel(item.opens_at)}.</p>:isClosed?<p className="notice">O prazo de participação terminou.</p>:userId?<form action={applyToOpportunity} className="detail-action-form"><input type="hidden" name="opportunity_id" value={item.id}/><input type="hidden" name="slug" value={item.slug}/>{businesses?.length?<label className="field-label">Responder em nome de<select name="business_id" defaultValue=""><option value="">Minha conta</option>{businesses.map((business:any)=><option value={business.id} key={business.id}>{business.name}</option>)}</select></label>:null}<textarea name="cover_note" rows={4} placeholder={actionLabel+" — acrescente uma nota breve (opcional)."} aria-label="Mensagem de participação"/><button className="btn primary full" type="submit">{application?"Actualizar participação →":actionLabel+" →"}</button></form>:<Link href={"/login?next=/oportunidades/"+encodeURIComponent(slug)} className="btn primary full">Entrar para participar</Link>}
   </aside>
  </section>
  <div className="opportunity-detail-layout"><article>
   <section className="opportunity-detail-section"><span className="eyebrow">A oportunidade</span><h2>O que está a ser disponibilizado.</h2><p className="opportunity-detail-longtext">{item.description}</p></section>
   <section className="opportunity-detail-section"><span className="eyebrow">Elegibilidade e condições</span><h2>Quem pode participar.</h2><div className="opportunity-requirements"><p>{item.requirements||"A entidade publicadora não indicou requisitos adicionais. Consulte as instruções oficiais antes de participar."}</p></div></section>
   <section className="opportunity-detail-section"><span className="eyebrow">Calendário</span><div className="opportunity-calendar"><div><span>Abertura</span><strong>{dateLabel(item.opens_at)}</strong></div><div><span>Encerramento</span><strong>{dateLabel(item.closes_at)}</strong></div></div></section>
   <section className="opportunity-detail-section"><span className="eyebrow">Documentos</span><h2>Materiais da entidade.</h2>{attachments?.length?<div className="publication-attachments">{attachments.map((file:any)=>{const url=supabase.storage.from("publication-media").getPublicUrl(file.storage_path).data.publicUrl;return <a className="publication-attachment" href={url} target="_blank" rel="noreferrer" key={file.id}>{file.kind==="IMAGE"?"Imagem":"Documento"} · {file.file_name}</a>})}</div>:<p className="opportunity-detail-longtext">Não foram anexados documentos a esta oportunidade.</p>}</section>
  </article><aside className="opportunity-detail-sidebar">
   <div className="opportunity-side-card"><span className="eyebrow">Participação</span><h3>{application?"A sua participação está registada.":notOpenYet?"As candidaturas ainda não abriram.":isClosed?"O prazo desta oportunidade terminou.":"O próximo passo é participar."}</h3><p>{application?"Pode acompanhar o estado da sua participação na sua área.":notOpenYet?"Consulte as condições e regresse quando o período de participação começar.":isClosed?"Esta oportunidade já não aceita novas participações.":"Leia as condições, prepare os documentos necessários e envie a sua participação através do processo indicado pela entidade."}</p>{application&&<div className="notice">Estado: {application.status}</div>}{application&&<Link href="/dashboard" className="btn primary full">Abrir a minha área</Link>}</div>
   <div className="opportunity-side-card muted-side"><span className="eyebrow">Nota de confiança</span><p>O MozEmpresas apresenta informação publicada pela entidade responsável. Confirme sempre os termos e canais oficiais antes de enviar documentos, dinheiro ou informação sensível.</p></div>
  </aside></div>
 </div></main><style>{`
 .opportunity-detail-new{background:#f5f7f6;padding-bottom:80px}.opportunity-detail-main{min-width:0}.opportunity-action-card{box-shadow:0 12px 35px rgba(20,44,41,.08)}.opportunity-action-card .detail-action-form{display:grid;gap:9px;margin-top:14px}.opportunity-action-card textarea{width:100%;box-sizing:border-box;border:1px solid #dbe3e0;border-radius:10px;padding:11px;background:#fff;font:inherit;resize:vertical}.opportunity-action-card select{width:100%;box-sizing:border-box;border:1px solid #dbe3e0;border-radius:10px;padding:10px;background:#fff}.opportunity-detail-new .opportunity-detail-section{background:#fff;border:1px solid #dbe3e0;border-radius:15px;padding:25px;margin-bottom:12px}.opportunity-detail-new .opportunity-detail-section h2{letter-spacing:-.035em}.opportunity-detail-new .opportunity-side-card{background:#fff;border:1px solid #dbe3e0;border-radius:15px;padding:20px;margin-bottom:12px}.opportunity-detail-new .opportunity-pill{background:#e7f2ef;color:#07544f;border:0}.opportunity-detail-new .detail-neutral-tag{background:#eef2f0;border:0}.opportunity-detail-new .opportunity-calendar{display:grid;grid-template-columns:1fr 1fr;gap:10px}.opportunity-detail-new .opportunity-calendar div{background:#f5f8f7;border-radius:11px;padding:15px;display:grid;gap:5px}.opportunity-detail-new .opportunity-calendar span{font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:#6d7976;font-weight:800}.opportunity-detail-new .opportunity-calendar strong{font-size:14px}.opportunity-detail-new .publication-attachment{display:block;padding:12px;border:1px solid #dbe3e0;border-radius:10px;margin-top:8px;font-size:12px;color:#0b6b63;font-weight:800}@media(max-width:650px){.opportunity-detail-new .opportunity-calendar{grid-template-columns:1fr}}
 `}</style></>
}
