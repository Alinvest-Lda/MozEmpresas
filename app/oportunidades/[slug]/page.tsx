import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
const labels:Record<string,string>={CONTEST:"Concurso",CALL:"Chamada",TENDER:"Contratação",FUNDING:"Financiamento",PARTNERSHIP:"Parceria",TRAINING:"Capacitação",EVENT:"Evento",BUSINESS:"Negócio",OTHER:"Outro"};
export default async function OpportunityDetail({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params; const supabase=await createClient();
 const {data:item}=await supabase.from("opportunities").select("id,title,slug,type,status,description,organization,location,opens_at,closes_at,requirements,created_at").eq("slug",slug).eq("status","PUBLISHED").maybeSingle();
 if(!item)notFound();
 return <main className="page"><div className="container"><Link href="/oportunidades" className="muted">← Voltar às oportunidades</Link>
  <div className="detail-grid"><article className="card detail-card"><span className="eyebrow">{labels[item.type]||item.type}</span><h1>{item.title}</h1><p className="detail-description">{item.description}</p><div className="meta" style={{marginTop:22}}>{item.organization&&<span className="tag">{item.organization}</span>}{item.location&&<span className="tag">{item.location}</span>}{item.closes_at&&<span className="tag">Prazo: {new Date(item.closes_at).toLocaleDateString("pt-MZ")}</span>}</div></article>
   <aside className="card"><span className="eyebrow">Participar</span><h3>Tem interesse nesta oportunidade?</h3><p className="muted">Entre na sua conta para manifestar interesse ou acompanhar a oportunidade.</p><Link href="/login" className="btn primary full">Entrar e participar</Link><Link href="/registo" className="btn full" style={{marginTop:9}}>Criar conta</Link></aside></div>
  <section className="detail-section"><span className="eyebrow">Requisitos</span><h2>Condições da oportunidade</h2><div className="card detail-text-card"><p>{item.requirements||"Os requisitos desta oportunidade serão apresentados pela entidade responsável."}</p>{item.opens_at&&<p className="muted">Abertura: {new Date(item.opens_at).toLocaleDateString("pt-MZ")}</p>}</div></section>
 </div></main>;
}