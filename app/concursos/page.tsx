import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const statusLabel:Record<string,string>={PUBLISHED:"Publicado",OPEN:"Aberto",CLOSED:"Encerrado",EVALUATION:"Em avaliação",RESULTS:"Resultados"};

export default async function Concursos({searchParams}:{searchParams:Promise<{q?:string;status?:string}>}) {
  const params=await searchParams; const supabase=await createClient();
  let query=supabase.from("contests").select("id,title,slug,description,status,category,opens_at,closes_at").in("status",["PUBLISHED","OPEN","CLOSED","EVALUATION","RESULTS"]).order("created_at",{ascending:false}).limit(48);
  if(params.q?.trim()) query=query.or(`title.ilike.%${params.q.trim()}%,description.ilike.%${params.q.trim()}%,category.ilike.%${params.q.trim()}%`);
  if(params.status&&params.status!=="all") query=query.eq("status",params.status);
  const {data,error}=await query;

  return <main className="page"><div className="container">
    <section className="page-header" style={{padding:"20px 0 12px"}}>
      <span className="eyebrow">Concursos e contratação</span><h1>Encontre concursos e processos de contratação.</h1>
      <p className="muted" style={{maxWidth:740,fontSize:16,lineHeight:1.6}}>Consulte chamadas públicas, requisitos, prazos e informação necessária para decidir onde apresentar uma candidatura ou proposta.</p>
    </section>
    <form className="toolbar" action="/concursos"><input name="q" defaultValue={params.q} style={{flex:1,minWidth:260}} placeholder="Pesquisar por título, sector ou palavra-chave" /><select name="status" defaultValue={params.status||"all"}><option value="all">Todos os estados</option>{Object.entries(statusLabel).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><button className="btn primary">Pesquisar</button></form>

    <section className="section" style={{padding:"18px 0 38px"}}><div className="grid">
      <div className="card module-card"><span className="module-number">CHAMADAS</span><h3>Consulte oportunidades</h3><p>Veja processos publicados por organizações e empresas.</p></div>
      <div className="card module-card"><span className="module-number">PRAZOS</span><h3>Controle datas</h3><p>Identifique abertura, encerramento e estado de cada processo.</p></div>
      <div className="card module-card"><span className="module-number">CANDIDATURA</span><h3>Analise requisitos</h3><p>Abra o concurso para consultar regras e informação disponível.</p></div>
    </div></section>

    <div className="result-bar"><strong>{data?.length??0} concursos</strong><span>Processos públicos</span></div>
    {error&&<div className="notice">Não foi possível carregar os concursos neste momento.</div>}
    <div className="grid">{data?.map(item=><Link href={"/concursos/"+item.slug} className="card listing" key={item.id}>
      <div className="listing-top"><span className="tag">{statusLabel[item.status]||item.status}</span>{item.closes_at&&<span className="status-dot">Até {new Date(item.closes_at).toLocaleDateString("pt-MZ")}</span>}</div>
      <h3>{item.title}</h3><p>{item.description}</p>{item.category&&<span className="tag" style={{marginTop:12,width:"fit-content"}}>{item.category}</span>}<span className="card-link">Consultar concurso →</span>
    </Link>)}
    {(!data||data.length===0)&&<div className="empty card"><div className="empty-icon">§</div><h3>Nenhum concurso publicado</h3><p>Os concursos e processos de contratação aparecerão aqui quando forem publicados.</p><Link href="/registo" className="btn primary">Registar empresa</Link></div>}</div>
  </div></main>;
}
