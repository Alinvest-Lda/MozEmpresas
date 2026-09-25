import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const labels: Record<string,string> = {CONTEST:"Concurso",CALL:"Chamada",TENDER:"Contratação",FUNDING:"Financiamento",PARTNERSHIP:"Parceria",TRAINING:"Capacitação",EVENT:"Evento",BUSINESS:"Negócio",OTHER:"Outro"};

export default async function Oportunidades({searchParams}:{searchParams:Promise<{q?:string;type?:string;location?:string}>}) {
  const params=await searchParams;
  const supabase=await createClient();
  let query=supabase.from("opportunities").select("id,title,slug,type,status,description,organization,location,opens_at,closes_at").eq("status","PUBLISHED").order("created_at",{ascending:false}).limit(48);
  if(params.q?.trim()) query=query.or(`title.ilike.%${params.q.trim()}%,description.ilike.%${params.q.trim()}%,organization.ilike.%${params.q.trim()}%`);
  if(params.type && params.type!=="all") query=query.eq("type",params.type);
  if(params.location?.trim()) query=query.ilike("location",`%${params.location.trim()}%`);
  const {data,error}=await query;
  return <main className="page"><div className="container">
    <div className="page-header page-header-row"><div><span className="eyebrow">Oportunidades</span><h1>Oportunidades de negócio</h1><p className="muted">Chamadas, parcerias, financiamento, eventos e necessidades empresariais.</p></div><Link href="/dashboard" className="btn primary">Publicar oportunidade</Link></div>
    <form className="toolbar" action="/oportunidades"><input name="q" defaultValue={params.q} style={{flex:1}} placeholder="Pesquisar oportunidade..." /><input name="location" defaultValue={params.location} placeholder="Localização" /><select name="type" defaultValue={params.type||"all"}><option value="all">Todos os tipos</option>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button className="btn primary">Pesquisar</button></form>
    <div className="result-bar"><span>{data?.length??0} oportunidades</span><span>Publicadas</span></div>
    {error&&<div className="notice">Não foi possível carregar as oportunidades neste momento.</div>}
    <div className="grid">{data?.map(item=><Link href={"/oportunidades/"+item.slug} className="card listing" key={item.id}><div className="listing-top"><span className="tag">{labels[item.type]||item.type}</span><span className="status-dot">{item.closes_at ? `Até ${new Date(item.closes_at).toLocaleDateString("pt-MZ")}` : "Aberta"}</span></div><h3>{item.title}</h3><p>{item.description}</p><div className="meta" style={{marginTop:12}}>{item.organization&&<span className="tag">{item.organization}</span>}{item.location&&<span className="tag">{item.location}</span>}</div><span className="card-link">Ver oportunidade →</span></Link>)}</div>
    {(!data||data.length===0)&&<div className="empty card"><div className="empty-icon">↗</div><h3>Não existem oportunidades publicadas</h3><p>Quando forem publicadas novas oportunidades, elas aparecerão nesta área.</p></div>}
  </div></main>;
}