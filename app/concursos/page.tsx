import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Concursos({searchParams}:{searchParams:Promise<{q?:string;status?:string}>}) {
  const params=await searchParams; const supabase=await createClient();
  let query=supabase.from("contests").select("id,title,slug,description,status,category,opens_at,closes_at").in("status",["PUBLISHED","OPEN","CLOSED","EVALUATION","RESULTS"]).order("created_at",{ascending:false}).limit(48);
  if(params.q?.trim()) query=query.or(`title.ilike.%${params.q.trim()}%,description.ilike.%${params.q.trim()}%,category.ilike.%${params.q.trim()}%`);
  if(params.status && params.status!=="all") query=query.eq("status",params.status);
  const {data,error}=await query;
  const statusLabel:Record<string,string>={PUBLISHED:"Publicado",OPEN:"Aberto",CLOSED:"Encerrado",EVALUATION:"Em avaliação",RESULTS:"Resultados"};
  return <main className="page"><div className="container">
    <div className="page-header page-header-row"><div><span className="eyebrow">Concursos</span><h1>Concursos e contratação</h1><p className="muted">Consulte chamadas, requisitos, prazos e processos de candidatura.</p></div><Link href="/dashboard" className="btn primary">Publicar concurso</Link></div>
    <form className="toolbar" action="/concursos"><input name="q" defaultValue={params.q} style={{flex:1}} placeholder="Pesquisar concurso..." /><select name="status" defaultValue={params.status||"all"}><option value="all">Todos os estados</option>{Object.entries(statusLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button className="btn primary">Pesquisar</button></form>
    <div className="result-bar"><span>{data?.length??0} concursos</span><span>Processos públicos</span></div>
    {error&&<div className="notice">Não foi possível carregar os concursos neste momento.</div>}
    <div className="grid">{data?.map(item=><Link href={"/concursos/"+item.slug} className="card listing" key={item.id}><div className="listing-top"><span className="tag">{statusLabel[item.status]||item.status}</span>{item.closes_at&&<span className="status-dot">Até {new Date(item.closes_at).toLocaleDateString("pt-MZ")}</span>}</div><h3>{item.title}</h3><p>{item.description}</p>{item.category&&<span className="tag" style={{marginTop:12,width:"fit-content"}}>{item.category}</span>}<span className="card-link">Ver concurso →</span></Link>)}</div>
    {(!data||data.length===0)&&<div className="empty card"><div className="empty-icon">§</div><h3>Nenhum concurso publicado</h3><p>Os concursos publicados pelas organizações aparecerão aqui.</p></div>}
  </div></main>;
}