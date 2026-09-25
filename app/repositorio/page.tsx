import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const labels:Record<string,string>={DOCUMENT:"Documento",GUIDE:"Guia",TEMPLATE:"Template",REPORT:"Relatório",PUBLICATION:"Publicação",RESOURCE:"Recurso",OTHER:"Outro"};

export default async function Repositorio({searchParams}:{searchParams:Promise<{q?:string;type?:string}>}) {
  const params=await searchParams; const supabase=await createClient();
  let query=supabase.from("repository_items").select("id,title,slug,description,item_type,created_at").eq("is_public",true).order("created_at",{ascending:false}).limit(48);
  if(params.q?.trim()) query=query.or(`title.ilike.%${params.q.trim()}%,description.ilike.%${params.q.trim()}%`);
  if(params.type && params.type!=="all") query=query.eq("item_type",params.type);
  const {data,error}=await query;
  return <main className="page"><div className="container">
    <div className="page-header"><span className="eyebrow">Informação empresarial</span><h1>Repositório</h1><p className="muted">Guias, modelos, relatórios, documentos e outros recursos empresariais.</p></div>
    <form className="toolbar" action="/repositorio"><input name="q" defaultValue={params.q} style={{flex:1}} placeholder="Pesquisar recursos..." /><select name="type" defaultValue={params.type||"all"}><option value="all">Todos os tipos</option>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button className="btn primary">Pesquisar</button></form>
    <div className="result-bar"><span>{data?.length??0} recursos</span><span>Conteúdo público</span></div>
    {error&&<div className="notice">Não foi possível carregar o repositório neste momento.</div>}
    <div className="grid">{data?.map(item=><Link href={"/repositorio/"+item.slug} className="card listing" key={item.id}><div className="listing-top"><span className="tag">{labels[item.item_type]||item.item_type}</span><span className="status-dot">Público</span></div><h3>{item.title}</h3><p>{item.description||"Recurso disponível no repositório MozEmpresas."}</p><span className="card-link">Consultar →</span></Link>)}</div>
    {(!data||data.length===0)&&<div className="empty card"><div className="empty-icon">▣</div><h3>O repositório ainda está vazio</h3><p>Os recursos públicos aparecerão aqui quando forem publicados.</p></div>}
  </div></main>;
}