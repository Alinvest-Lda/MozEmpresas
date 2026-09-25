import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
const labels:Record<string,string>={DOCUMENT:"Documento",GUIDE:"Guia",TEMPLATE:"Template",REPORT:"Relatório",PUBLICATION:"Publicação",RESOURCE:"Recurso",OTHER:"Outro"};
export default async function RepositoryDetail({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params; const supabase=await createClient();
 const {data:item}=await supabase.from("repository_items").select("id,title,slug,description,item_type,created_at").eq("slug",slug).eq("is_public",true).maybeSingle();
 if(!item)notFound();
 const {data:files}=await supabase.from("repository_files").select("id,file_name,mime_type,size_bytes").eq("item_id",item.id).order("created_at");
 return <main className="page"><div className="container"><Link href="/repositorio" className="muted">← Voltar ao repositório</Link>
  <article className="card repository-detail"><span className="eyebrow">{labels[item.item_type]||item.item_type}</span><h1>{item.title}</h1><p className="detail-description">{item.description||"Recurso empresarial publicado no MozEmpresas."}</p><div className="meta"><span className="tag">Público</span><span className="tag">{new Date(item.created_at).toLocaleDateString("pt-MZ")}</span></div>
   <div className="detail-section"><h2>Ficheiros disponíveis</h2>{files?.length?<div className="file-list">{files.map(f=><div className="file-row" key={f.id}><div><strong>{f.file_name}</strong><small className="muted">{f.mime_type||"Ficheiro"}{f.size_bytes?" · "+Math.round(f.size_bytes/1024)+" KB":""}</small></div><Link href="/login" className="btn">Aceder</Link></div>)}</div>:<div className="notice">Ainda não existem ficheiros associados a este recurso.</div>}</div>
  </article></div></main>;
}