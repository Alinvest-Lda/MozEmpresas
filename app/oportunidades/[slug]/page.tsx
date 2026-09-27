import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
const labels:Record<string,string>={CONTEST:"Concurso",CALL:"Chamada",TENDER:"Contratação",FUNDING:"Financiamento",PARTNERSHIP:"Parceria",TRAINING:"Capacitação",EVENT:"Evento",BUSINESS:"Negócio",OTHER:"Outro"};
export default async function OpportunityDetail({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params; const supabase=await createClient();
 const { data: claimsData } = await supabase.auth.getClaims();
 const userId = claimsData?.claims?.sub || null;
 const {data:item}=await supabase.from("opportunities").select("id,title,slug,type,status,description,organization,location,opens_at,closes_at,requirements,created_at").eq("slug",slug).eq("status","PUBLISHED").maybeSingle();
 if(!item)notFound();
 const { data: application } = userId ? await supabase.from("opportunity_applications").select("status").eq("opportunity_id",item.id).eq("applicant_id",userId).maybeSingle() : { data: null };
 return <main className="page"><div className="container"><Link href="/oportunidades" className="muted">← Voltar às oportunidades</Link>
  <div className="detail-grid"><article className="card detail-card"><span className="eyebrow">{labels[item.type]||item.type}</span><h1>{item.title}</h1><p className="detail-description">{item.description}</p><div className="meta" style={{marginTop:22}}>{item.organization&&<span className="tag">{item.organization}</span>}{item.location&&<span className="tag">{item.location}</span>}{item.closes_at&&<span className="tag">Prazo: {new Date(item.closes_at).toLocaleDateString("pt-MZ")}</span>}</div></article>
   <aside className="card"><span className="eyebrow">Participar</span><h3>Tem interesse nesta oportunidade?</h3><p className="muted">{userId ? "Como membro da comunidade, pode acompanhar esta oportunidade e usar as funcionalidades de participação disponíveis." : "Visitantes podem conhecer a oportunidade. Membros registados recebem acesso a benefícios e comunicações da comunidade."}</p>{application&&<div className="notice">Participação registada: {application.status}</div>}<Link href={userId ? "/dashboard" : "/login?next=/oportunidades/" + encodeURIComponent(slug)} className="btn primary full">{userId ? "Ir para a área de participação" : "Entrar e participar"}</Link><Link href="/registo" className="btn full" style={{marginTop:9}}>Criar conta</Link></aside></div>
  <section className="detail-section"><span className="eyebrow">Informação da oportunidade</span><h2>{userId ? "Informação e benefícios para membros" : "Informação geral"}</h2>{userId&&<div className="notice">Benefícios exclusivos da comunidade podem incluir acompanhamento, notificações e recursos de participação ligados ao módulo de oportunidades.</div>}<span className="eyebrow">Requisitos</span><h2>Condições da oportunidade</h2><div className="card detail-text-card"><p>{item.requirements||"Os requisitos desta oportunidade serão apresentados pela entidade responsável."}</p>{item.opens_at&&<p className="muted">Abertura: {new Date(item.opens_at).toLocaleDateString("pt-MZ")}</p>}</div></section>
 </div></main>;
}