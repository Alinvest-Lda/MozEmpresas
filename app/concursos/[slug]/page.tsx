import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
const statusLabel:Record<string,string>={PUBLISHED:"Publicado",OPEN:"Aberto",CLOSED:"Encerrado",EVALUATION:"Em avaliação",RESULTS:"Resultados"};
export default async function ContestDetail({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params; const supabase=await createClient();
 const { data: claimsData } = await supabase.auth.getClaims();
 const signedIn = Boolean(claimsData?.claims?.sub);
 const {data:item}=await supabase.from("contests").select("id,title,slug,description,status,category,rules,opens_at,closes_at").eq("slug",slug) .eq("status","OPEN").maybeSingle();
 if(!item)notFound();
 const {data:reqs}=signedIn ? await supabase.from("contest_requirements").select("title,description,required").eq("contest_id",item.id).order("title") : { data: [] };
 return <main className="page"><div className="container"><Link href="/concursos" className="muted">← Voltar aos concursos</Link>
  <div className="detail-grid"><article className="card detail-card"><div className="listing-top"><span className="tag">{statusLabel[item.status]||item.status}</span>{item.closes_at&&<span className="status-dot">Até {new Date(item.closes_at).toLocaleDateString("pt-MZ")}</span>}</div><h1>{item.title}</h1><p className="detail-description">{signedIn ? item.description : (item.description.length > 320 ? item.description.slice(0, 320) + "…" : item.description)}</p>{item.category&&<span className="tag">{item.category}</span>}</article>
   <aside className="card"><span className="eyebrow">Candidatura</span><h3>Quer participar?</h3><p className="muted">{item.status==="OPEN"||item.status==="PUBLISHED"?"Entre na sua conta para iniciar a candidatura.":"Este concurso não está aberto a novas candidaturas."}</p><Link href={signedIn ? "/dashboard" : "/login?next=/concursos/" + encodeURIComponent(slug)} className="btn primary full">{signedIn ? "Ir para candidatura →" : "Entrar para candidatar"}</Link><Link href="/registo" className="btn full" style={{marginTop:9}}>Criar conta</Link></aside></div>
  <section className="detail-section"><span className="eyebrow">Acesso</span>
  {!signedIn && <div className="notice">Está a ver o preview público. Entre na plataforma para consultar requisitos completos e preparar a candidatura.</div>}
  <span className="eyebrow">Requisitos</span><h2>Documentação e condições</h2>{signedIn ? (reqs?.length ? <div className="requirement-list">{reqs.map((r,i)=><div className="card requirement" key={i}><div className="listing-top"><strong>{r.title}</strong>{r.required&&<span className="tag">Obrigatório</span>}</div><p className="muted">{r.description||"Consulte as condições do concurso."}</p></div>)}</div> : <div className="card detail-text-card"><p>{item.rules||"As regras e requisitos serão apresentados pela entidade responsável."}</p></div>) : <div className="card detail-text-card"><p>Os requisitos completos e a documentação de candidatura estão disponíveis para membros autenticados.</p></div>}</section>
  <section className="detail-section"><span className="eyebrow">Calendário</span><h2>Datas</h2><div className="meta">{item.opens_at&&<span className="tag">Abertura: {new Date(item.opens_at).toLocaleDateString("pt-MZ")}</span>}{item.closes_at&&<span className="tag">Fecho: {new Date(item.closes_at).toLocaleDateString("pt-MZ")}</span>}</div></section>
 </div></main>;
}